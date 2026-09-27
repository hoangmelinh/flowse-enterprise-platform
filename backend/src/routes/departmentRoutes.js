import { Router } from "express";
import {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
} from "../controllers/departmentController.js";
import { requireAdmin } from "../middlewares/roleMiddlewares.js";

const router = Router();

router.get("/", getDepartments);
router.get("/:id", getDepartmentById);
router.post("/", requireAdmin, createDepartment);
router.put("/:id", requireAdmin, updateDepartment);

export default router;
