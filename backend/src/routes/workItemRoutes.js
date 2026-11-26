import { Router } from "express";
import {
  getMyWork,
  getWorkItemById,
  createWorkItem,
} from "../controllers/workItemController.js";
import { requireTaskMember } from "../middlewares/roleMiddlewares.js";

const router = Router();

router.get("/my-work", getMyWork);
router.get("/:id", requireTaskMember((req) => req.params.id), getWorkItemById);
router.post("/", createWorkItem);

export default router;
