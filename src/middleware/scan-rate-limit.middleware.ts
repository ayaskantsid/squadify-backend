import { Request, Response, NextFunction } from "express";
import { ScanUsage } from "../models/scan-usage.model";

// ─── Configurable limits ───────────────────────────────────────────
const GLOBAL_DAILY_LIMIT = 18; // Leave buffer below Gemini's 20 RPD
const USER_DAILY_LIMIT   = 3;  // Very tight — 20 RPD shared across all users

/** Returns today's date string in Pacific Time (matches Gemini's midnight-PT reset) */
function getTodayPacific(): string {
  // "en-CA" locale gives YYYY-MM-DD format
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}

/**
 * Middleware — blocks the request if the global or per-user daily scan limit is exceeded.
 * Must run AFTER `authMiddleware` and `resolveCurrentUser` so `req.currentUser` is available.
 *
 * On success, stores `res.locals.scanDateKey` and `res.locals.scanUserId` for the controller
 * to call `recordScanUsage()` after a successful Gemini call.
 */
export async function scanRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dateKey = getTodayPacific();
    const userId  = req.currentUser?._id?.toString();

    // 1. Check global limit
    const globalUsage = await ScanUsage.findOne({ scopeId: "global", dateKey }).lean();
    if (globalUsage && globalUsage.count >= GLOBAL_DAILY_LIMIT) {
      res.status(429).json({
        success: false,
        message: "Daily scan limit reached for the app. Please try again tomorrow.",
        retryAfter: "midnight PT",
      });
      return;
    }

    // 2. Check per-user limit
    if (userId) {
      const userUsage = await ScanUsage.findOne({ scopeId: userId, dateKey }).lean();
      const currentCount = userUsage?.count ?? 0;

      if (currentCount >= USER_DAILY_LIMIT) {
        res.status(429).json({
          success: false,
          message: `You've used all ${USER_DAILY_LIMIT} receipt scans for today. Try again tomorrow.`,
          remaining: 0,
          retryAfter: "midnight PT",
        });
        return;
      }
    }

    // 3. Stash context for the controller to record usage after a successful scan
    res.locals.scanDateKey = dateKey;
    res.locals.scanUserId  = userId;

    next();
  } catch (err) {
    console.error("[scanRateLimit] Error checking scan limits:", err);
    // Fail-open: allow the scan to proceed if usage lookup fails
    next();
  }
}

/**
 * Increment both global and per-user counters atomically.
 * Call this AFTER a successful Gemini response — failed scans don't consume quota.
 */
export async function recordScanUsage(dateKey: string, userId?: string): Promise<{ globalRemaining: number; userRemaining: number }> {
  const now = new Date();

  // Atomic upsert for global counter
  const globalDoc = await ScanUsage.findOneAndUpdate(
    { scopeId: "global", dateKey },
    { $inc: { count: 1 }, $set: { lastScanAt: now } },
    { upsert: true, new: true }
  );

  let userCount = 0;

  // Atomic upsert for per-user counter
  if (userId) {
    const userDoc = await ScanUsage.findOneAndUpdate(
      { scopeId: userId, dateKey },
      { $inc: { count: 1 }, $set: { lastScanAt: now } },
      { upsert: true, new: true }
    );
    userCount = userDoc.count;
  }

  return {
    globalRemaining: Math.max(0, GLOBAL_DAILY_LIMIT - globalDoc.count),
    userRemaining:   Math.max(0, USER_DAILY_LIMIT - userCount),
  };
}

/**
 * Read-only quota check — returns current usage without incrementing anything.
 * Used by the GET /scan-receipt/quota endpoint so the frontend can decide
 * whether to show or disable the "Scan Receipt" button.
 */
export async function getScanQuota(userId?: string) {
  const dateKey = getTodayPacific();

  const globalUsage = await ScanUsage.findOne({ scopeId: "global", dateKey }).lean();
  const globalCount = globalUsage?.count ?? 0;

  let userCount = 0;
  if (userId) {
    const userUsage = await ScanUsage.findOne({ scopeId: userId, dateKey }).lean();
    userCount = userUsage?.count ?? 0;
  }

  return {
    userLimit:       USER_DAILY_LIMIT,
    userUsed:        userCount,
    userRemaining:   Math.max(0, USER_DAILY_LIMIT - userCount),
    globalLimit:     GLOBAL_DAILY_LIMIT,
    globalUsed:      globalCount,
    globalRemaining: Math.max(0, GLOBAL_DAILY_LIMIT - globalCount),
    canScan:         userCount < USER_DAILY_LIMIT && globalCount < GLOBAL_DAILY_LIMIT,
    resetsAt:        "midnight PT",
  };
}
