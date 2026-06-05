import { Request, Response, NextFunction } from "express";
import { User } from "../models/user.model";

declare global {
  namespace Express {
    interface Request {
      currentUser?: any;
    }
  }
}

export async function resolveCurrentUser(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findOne({ firebaseUid: req.user.uid }).lean();
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.currentUser = user;
    next();
  } catch (err) {
    console.error("Error resolving current user", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

export default resolveCurrentUser;
