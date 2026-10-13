import { Router } from "express";
import {
  getIncidents,
  getIncidentById,
  reportIncident,
  requestParts,
  deleteIncident,
  getDowntimeStats,
  analyzeEvidence,
} from "../controllers/incidentController.js";

const router = Router();

router.get("/stats/downtime-mttr", getDowntimeStats);
router.post("/analyze-evidence", analyzeEvidence);
router.get("/", getIncidents);
router.get("/:id", getIncidentById);
router.post("/", reportIncident);
router.post("/:id/request-parts", requestParts);
router.delete("/:id", deleteIncident);

export default router;
