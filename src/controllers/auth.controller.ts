import { Request, Response } from "express";
import { User } from "../models/user.model";

/**
 * POST /api/auth/me
 * Called after Firebase phone OTP sign-in succeeds on the client.
 * Upserts the user in MongoDB and returns the user profile.
 * Requires authMiddleware to have already verified the token.
 */
export async function getOrCreateUser(req: Request, res: Response) {
    try {
        const { uid, phoneNumber } = req.user!;
        const { displayName } = req.body;

        const user = await User.findOneAndUpdate(
            { firebaseUid: uid },
            {
                firebaseUid: uid,
                phoneNumber: phoneNumber || "",
                ...(displayName && { displayName }),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(200).json(user);
    } catch (error) {
        console.error("Error in getOrCreateUser:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
