import { Router } from "express";
import { createTrip, deleteTrip, getTripById, getTrips, updateTrip } from "../controllers/trip.controller";

const router = Router();

router.post("/", createTrip);
router.get("/", getTrips);
router.get("/:id", getTripById);
router.put("/:id", updateTrip);
router.delete("/:id", deleteTrip);

export default router;
