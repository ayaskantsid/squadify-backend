import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

export function initializeFirebase(): void {
    let serviceAccount: object;
    const inlineKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;

    try {
        if (inlineKey) {
            // Production (Render): read JSON directly from env var
            serviceAccount = JSON.parse(inlineKey);
        } else if (keyPath) {
            // Local dev: read from file
            const resolvedPath = path.resolve(keyPath);
            const fileContents = fs.readFileSync(resolvedPath, "utf-8");
            serviceAccount = JSON.parse(fileContents);
        } else {
            console.error(
                "Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_KEY_PATH."
            );
            process.exit(1);
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        });

        console.log("Firebase Admin SDK initialized successfully");
    } catch (error) {
        console.error("Error initializing Firebase Admin SDK:", error);
        process.exit(1);
    }
}

export { admin };
