// cmd/server is the entry point for the SciBlock Go API server.
//
// Startup sequence:
//  1. Load configuration from environment variables (config.Load)
//  2. Connect to PostgreSQL via pgx (db.Connect)
//  3. Optionally run goose migrations (only when AUTO_MIGRATE=true)
//  4. Wire up dependencies: repository → service → handler
//  5. Build the HTTP router via router.New and start the server with graceful shutdown
//
// Migration policy:
//
//	AUTO_MIGRATE=true  → run goose on every startup (dev convenience)
//	AUTO_MIGRATE=false → skip; run explicitly with `make migrate` or scripts/migrate.sh goose
package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"sciblock/go-api/internal/config"
	"sciblock/go-api/internal/db"
	"sciblock/go-api/internal/handler"
	"sciblock/go-api/internal/repository"
	"sciblock/go-api/internal/router"
	"sciblock/go-api/internal/service"
)

func main() {
	cfg := config.Load()

	// -------------------------------------------------------------------------
	// Database
	// -------------------------------------------------------------------------
	pool, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer pool.Close()
	log.Println("database connected")

	// -------------------------------------------------------------------------
	// Migrations (optional — only when AUTO_MIGRATE=true)
	// -------------------------------------------------------------------------
	if cfg.AutoMigrate {
		log.Println("AUTO_MIGRATE=true: running goose migrations...")
		if err := runMigrations(cfg.DatabaseURL); err != nil {
			log.Fatalf("migration failed: %v", err)
		}
		log.Println("migrations complete")
	} else {
		log.Println("AUTO_MIGRATE not set: skipping migrations (run `make migrate` manually)")
	}

	// -------------------------------------------------------------------------
	// Dependency wiring: repository → service → handler
	// -------------------------------------------------------------------------
	userRepo := repository.NewUserRepository(pool)
	sciNoteRepo := repository.NewSciNoteRepository(pool)
	experimentRepo := repository.NewExperimentRepository(pool)

	authSvc := service.NewAuthService(userRepo, cfg.JWTSecret, cfg.JWTExpiryHours)
	sciNoteSvc := service.NewSciNoteService(sciNoteRepo)
	experimentSvc := service.NewExperimentService(experimentRepo, sciNoteRepo)

	authH := handler.NewAuthHandler(authSvc)
	sciNoteH := handler.NewSciNoteHandler(sciNoteSvc)
	experimentH := handler.NewExperimentHandler(experimentSvc)

	// -------------------------------------------------------------------------
	// HTTP server with graceful shutdown
	// -------------------------------------------------------------------------
	addr := fmt.Sprintf(":%s", cfg.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      router.New(cfg.JWTSecret, authH, sciNoteH, experimentH),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("Go API server listening on %s (env: %s)", addr, cfg.Env)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-quit
	log.Println("shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("forced shutdown: %v", err)
	}
	log.Println("server stopped cleanly")
}

// runMigrations executes all pending goose migrations.
// Uses the standard database/sql driver because goose requires it.
// Migration SQL files are embedded in the db package (internal/db/migrations_embed.go).
func runMigrations(databaseURL string) error {
	sqlDB, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return fmt.Errorf("open sql.DB for migrations: %w", err)
	}
	defer sqlDB.Close()

	goose.SetBaseFS(db.MigrationsFS)
	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("set goose dialect: %w", err)
	}
	if err := goose.Up(sqlDB, "migrations"); err != nil {
		return fmt.Errorf("goose up: %w", err)
	}
	return nil
}
