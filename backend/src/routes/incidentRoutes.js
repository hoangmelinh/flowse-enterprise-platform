import { Router } from "express";
import {
  getIncidents,
  getIncidentById,
  reportIncident,
  requestParts,
  deleteIncident,
  getDowntimeStats,
  analyzeEvidence,
  reopenIncident,
  assignTechnician,
  appendEvidence,
} from "../controllers/incidentController.js";
import { requireTaskManager, requireTaskMember, taskOfIncident } from "../middlewares/roleMiddlewares.js";

const router = Router();

router.get("/stats/downtime-mttr", getDowntimeStats);
router.post("/analyze-evidence", analyzeEvidence);
router.get("/", getIncidents);
router.get("/:id", requireTaskMember(taskOfIncident), getIncidentById);
router.post("/", reportIncident);
router.post("/:id/assign", requireTaskManager(taskOfIncident), assignTechnician);
router.post("/:id/evidence", requireTaskMember(taskOfIncident), appendEvidence);
router.post("/:id/reopen", requireTaskMember(taskOfIncident), reopenIncident);
router.post("/:id/request-parts", requireTaskMember(taskOfIncident), requestParts);
router.delete("/:id", requireTaskManager(taskOfIncident), deleteIncident);

export default router;
