import { Request, Response, NextFunction } from "express";
import { admin } from "../config/firebase";

// Extend Express Request to include authenticated user info
declare global {
    namespace Express {
        interface Request {
            user?: {
                uid: string;
                phoneNumber?: string;
                email?: string;
            };
        }
    }
}

export async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ message: "Unauthorized: No token provided" });
        return;
    }

    const token = authHeader.split("Bearer ")[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);

        req.user = {
            uid: decodedToken.uid,
            phoneNumber: decodedToken.phone_number,
            email: decodedToken.email,
        };

        next();
    } catch (error) {
        console.error("Error verifying Firebase token:", error);
        res.status(401).json({ message: "Unauthorized: Invalid or expired token" });
    }
}
