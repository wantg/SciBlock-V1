// Package service implements the business logic layer.
//
// Rule: service functions must NOT import net/http or any handler/dto type.
// Rule: service functions call repository interfaces — never pgx directly.
package service

import (
        "context"
        "fmt"
        "strings"

        "golang.org/x/crypto/bcrypt"
        "sciblock/go-api/internal/domain"
        "sciblock/go-api/internal/repository"
        "sciblock/go-api/pkg/token"
)

// AuthService handles login and token validation.
type AuthService struct {
        users          repository.UserRepository
        jwtSecret      string
        jwtExpiryHours int
}

// NewAuthService creates an AuthService with the given dependencies.
func NewAuthService(users repository.UserRepository, jwtSecret string, jwtExpiryHours int) *AuthService {
        return &AuthService{
                users:          users,
                jwtSecret:      jwtSecret,
                jwtExpiryHours: jwtExpiryHours,
        }
}

// LoginResult is returned on successful authentication.
type LoginResult struct {
        Token string
        User  *domain.User
}

// Login validates credentials and issues a JWT.
// Returns ErrInvalidCredentials when the email is unknown or the password is wrong.
func (s *AuthService) Login(ctx context.Context, email, password string) (*LoginResult, error) {
        email = strings.ToLower(strings.TrimSpace(email))
        if email == "" || password == "" {
                return nil, fmt.Errorf("email and password are required")
        }

        user, err := s.users.GetByEmail(ctx, email)
        if err != nil {
                return nil, fmt.Errorf("lookup user: %w", err)
        }
        if user == nil {
                return nil, ErrInvalidCredentials
        }

        if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
                return nil, ErrInvalidCredentials
        }

        signed, err := token.Sign(user, s.jwtSecret, s.jwtExpiryHours)
        if err != nil {
                return nil, fmt.Errorf("sign token: %w", err)
        }

        return &LoginResult{Token: signed, User: user}, nil
}

// Me resolves a user ID (from JWT claims) to the full User record.
func (s *AuthService) Me(ctx context.Context, userID string) (*domain.User, error) {
        user, err := s.users.GetByID(ctx, userID)
        if err != nil {
                return nil, fmt.Errorf("lookup user: %w", err)
        }
        if user == nil {
                return nil, fmt.Errorf("user not found")
        }
        return user, nil
}
