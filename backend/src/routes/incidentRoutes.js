import { Router } from "express";
import {
  getIncidents,
  getIncidentById,
  reportIncident,
} from "../controllers/incidentController.js";

const router = Router();

router.get("/", getIncidents);
router.get("/:id", getIncidentById);
router.post("/", reportIncident);

export default router;
