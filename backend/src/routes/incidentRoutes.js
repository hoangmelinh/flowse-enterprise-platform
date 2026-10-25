import { Router } from "express";
import {
  getIncidents,
  getIncidentById,
  reportIncident,
  requestParts,
  deleteIncident,
  getDowntimeStats,
  analyzeEvidence,
  cleanTestData,
  reopenIncident,
  assignTechnician,
  appendEvidence,
} from "../controllers/incidentController.js";
import { requireManagerOrAdmin } from "../middlewares/roleMiddlewares.js";

const router = Router();

router.get("/stats/downtime-mttr", getDowntimeStats);
router.post("/clean-test-data", cleanTestData);
router.post("/analyze-evidence", analyzeEvidence);
router.get("/", getIncidents);
router.get("/:id", getIncidentById);
router.post("/", reportIncident);
router.post("/:id/assign", requireManagerOrAdmin, assignTechnician);
router.post("/:id/evidence", appendEvidence);
router.post("/:id/reopen", reopenIncident);
router.post("/:id/request-parts", requestParts);
router.delete("/:id", deleteIncident);

export default router;
