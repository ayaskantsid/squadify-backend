import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { getOrCreateUser } from "../controllers/auth.controller";
import { admin } from "../config/firebase";

const router = Router();

// POST /api/auth/me — protected: client sends Firebase token to register/login
router.post("/me", authMiddleware, getOrCreateUser);

// DEV ONLY: Generate a custom token for testing with Postman
// Exchange the returned customToken for an idToken via:
//   POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=YOUR_WEB_API_KEY
//   Body: { "token": "<customToken>", "returnSecureToken": true }
// Then use the idToken as: Authorization: Bearer <idToken>
if (process.env.NODE_ENV !== "production") {
    router.post("/dev-token", async (_req, res) => {
        try {
            const testUid = "test-user-dev";
            const customToken = await admin.auth().createCustomToken(testUid, {
                phone_number: "+919999999999",
            });
            res.json({
                customToken,
                instructions: {
                    step1: "Copy the customToken above",
                    step2: "POST to https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=YOUR_FIREBASE_WEB_API_KEY",
                    step2_body: { token: "<paste customToken here>", returnSecureToken: true },
                    step3: "Copy the idToken from the response",
                    step4: "Use in Postman header: Authorization: Bearer <idToken>",
                },
            });
        } catch (error) {
            console.error("Error generating dev token:", error);
            res.status(500).json({ message: "Failed to generate dev token", error: (error as Error).message });
        }
    });
}

export default router;
