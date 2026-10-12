import { Router } from "express";
import {
  getIncidents,
  getIncidentById,
  reportIncident,
  requestParts,
  deleteIncident,
} from "../controllers/incidentController.js";

const router = Router();

router.get("/", getIncidents);
router.get("/:id", getIncidentById);
router.post("/", reportIncident);
router.post("/:id/request-parts", requestParts);
router.delete("/:id", deleteIncident);

export default router;
