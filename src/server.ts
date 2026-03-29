import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import { initializeFirebase } from "./config/firebase";
import { authMiddleware } from "./middleware/auth.middleware";
import authRoutes from "./routes/auth.routes";
import tripRoutes from "./routes/trip.routes";
import participantRoutes from "./routes/participant.routes";
import expenseRoutes from "./routes/expense.routes";
import balanceRoutes from "./routes/balance.routes";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// connect DB
connectDB();

// initialize Firebase Admin SDK
initializeFirebase();

// auth routes (auth middleware applied inside the route file)
app.use("/api/auth", authRoutes);

// protect all other /api/* routes
app.use("/api", authMiddleware);

// trip routes
app.use("/api/trips", tripRoutes);

// participant routes
app.use("/api/participants", participantRoutes);

// expense routes
app.use("/api/expenses", expenseRoutes);

// balance routes
app.use('/api/balances', balanceRoutes);

// health check
app.get("/", (_, res) => res.send("Squadify API (TypeScript) running"));

const PORT: number = parseInt(process.env.PORT || "5000") || 5000;
const HOST: string = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => console.log(`🚀 Server running on http://${HOST}:${PORT}`));