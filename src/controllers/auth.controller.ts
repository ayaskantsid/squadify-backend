import { Request, Response } from "express";
import { User } from "../models/user.model";
import { Participant } from "../models/participant.model";

/**
 * POST /api/auth/me
 * Called after Firebase phone OTP sign-in succeeds on the client.
 * Upserts the user in MongoDB and returns the user profile.
 * Also auto-accepts any pending trip invitations for this email.
 * Requires authMiddleware to have already verified the token.
 */
export async function getOrCreateUser(req: Request, res: Response) {
    try {
        const { uid, email: firebaseEmail } = req.user!;
        const { displayName } = req.body;

        const user = await User.findOneAndUpdate(
            { firebaseUid: uid },
            {
                firebaseUid: uid,
                email: firebaseEmail || "",
                ...(displayName && { displayName }),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Auto-link and accept pending invitations for this email
        if (user.email) {
            const pendingInvitations = await Participant.find({
                email: user.email.toLowerCase(),
                userId: { $exists: false },
                status: "invited",
            });

            for (const invitation of pendingInvitations) {
                invitation.userId = user._id;
                await invitation.save();
            }
        }

        res.status(200).json(user);
    } catch (error) {
        console.error("Error in getOrCreateUser:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
