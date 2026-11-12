import Department from "../models/Department.js";
import { departmentWorkspace } from "../middlewares/roleMiddlewares.js";

export const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.getAll();
    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    next(error);
  }
};

export const getDepartmentTree = async (req, res, next) => {
  try {
    const tree = await Department.getHierarchyTree();
    res.json({
      success: true,
      data: tree,
    });
  } catch (error) {
    next(error);
  }
};

export const getDepartmentById = async (req, res, next) => {
  try {
    const department = await Department.getById(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }
    res.json({
      success: true,
      data: department,
    });
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    const { name, code, manager_id, parent_id } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: "Name and code are required" });
    }
    const created = await Department.create({ name, code, manager_id, parent_id, workspace_id: req.workspaceId });
    res.status(201).json({
      success: true,
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    // Không cho gắn phòng ban vào cây của công ty khác
    const { parent_id } = req.body || {};
    if (parent_id && (await departmentWorkspace(parent_id)) !== req.workspaceId) {
      return res.status(400).json({ success: false, message: "Phòng ban cha không thuộc nơi làm việc này" });
    }
    const updated = await Department.update(req.params.id, req.body);
    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};
