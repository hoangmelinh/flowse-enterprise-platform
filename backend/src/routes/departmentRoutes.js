import { Router } from "express";
import {
  getDepartments,
  getDepartmentTree,
  getDepartmentById,
  createDepartment,
  updateDepartment,
} from "../controllers/departmentController.js";
import { departmentWorkspace, requireAdmin } from "../middlewares/roleMiddlewares.js";

const router = Router();

router.get("/tree", getDepartmentTree);
router.get("/", getDepartments);
router.get("/:id", getDepartmentById);
router.post("/", requireAdmin((req) => departmentWorkspace(req.body?.parent_id)), createDepartment);
router.put("/:id", requireAdmin((req) => departmentWorkspace(req.params.id)), updateDepartment);

export default router;
