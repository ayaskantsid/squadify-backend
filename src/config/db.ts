import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "";
const DB_NAME = process.env.DB_NAME || "";


export async function connectDB() {    
    try {
        await mongoose.connect(MONGO_URI, {
            dbName: DB_NAME,
        });
        console.log("Connected to MongoDB successfully");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
}
