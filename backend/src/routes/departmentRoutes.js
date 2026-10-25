import { Router } from "express";
import {
  getDepartments,
  getDepartmentTree,
  getDepartmentById,
  createDepartment,
  updateDepartment,
} from "../controllers/departmentController.js";
import { requireAdmin } from "../middlewares/roleMiddlewares.js";

const router = Router();

router.get("/tree", getDepartmentTree);
router.get("/", getDepartments);
router.get("/:id", getDepartmentById);
router.post("/", requireAdmin, createDepartment);
router.put("/:id", requireAdmin, updateDepartment);

export default router;
