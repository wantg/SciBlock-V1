import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/requireAuth";
import healthRouter from "./health";
import authRouter from "./auth";
import adminRouter from "./admin";
import aiRouter from "./ai";
import messagesRouter from "./messages";
import teamRouter from "./team";
import reportsRouter from "./reports";
import usersRouter from "./users";
import sharesRouter from "./shares";
import experimentReportRouter from "./experiment-report";

const router: IRouter = Router();

// Public routes — no authentication required.
router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/admin", adminRouter);
router.use("/ai", aiRouter);

// Protected routes — requireAuth validates the Bearer JWT before each request.
// User identity is available via res.locals.userId / role / email / name.
// Experiment report endpoints (AI generation, manual save, clear).
// Must be registered BEFORE the Go proxy pathFilter excludes them from forwarding.
router.use("/experiments", experimentReportRouter);

router.use("/messages", requireAuth, messagesRouter);
router.use("/team",     requireAuth, teamRouter);
router.use("/reports",  requireAuth, reportsRouter);
router.use("/users",    requireAuth, usersRouter);
router.use("/shares",   requireAuth, sharesRouter);

export default router;
