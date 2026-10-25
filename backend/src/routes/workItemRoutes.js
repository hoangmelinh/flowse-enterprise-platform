import { Router } from "express";
import {
  getMyWork,
  getWorkItemById,
  createWorkItem,
} from "../controllers/workItemController.js";

const router = Router();

router.get("/my-work", getMyWork);
router.get("/:id", getWorkItemById);
router.post("/", createWorkItem);

export default router;
