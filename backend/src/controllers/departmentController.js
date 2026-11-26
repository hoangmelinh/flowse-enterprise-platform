import Department from "../models/Department.js";
import con from "../config/connect.js";
import { departmentWorkspace } from "../middlewares/roleMiddlewares.js";

async function ensureManagerBelongsToWorkspace(managerId, workspaceId) {
  if (managerId === null || managerId === undefined || managerId === "") return;
  const check = await con.query(
    `SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2 AND deleted_at IS NULL LIMIT 1`,
    [Number(workspaceId), Number(managerId)]
  );
  if (check.rows.length === 0) {
    const err = new Error("Trưởng bộ phận được chỉ định phải là thành viên đang hoạt động trong Workspace này.");
    err.status = 400;
    throw err;
  }
}

async function hasAncestorCycle(deptId, candidateParentId) {
  let cursor = Number(candidateParentId);
  const visited = new Set([Number(deptId)]);
  while (cursor) {
    if (visited.has(cursor)) return true;
    visited.add(cursor);
    const parentRow = await Department.getById(cursor);
    cursor = parentRow?.parent_id ? Number(parentRow.parent_id) : 0;
  }
  return false;
}

export const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.getAll(req.workspaceId || null, req.userWorkspaceIds || []);
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
    const tree = await Department.getHierarchyTree(req.workspaceId || null, req.userWorkspaceIds || []);
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
    if (!department.workspace_id || !(req.userWorkspaceIds || []).includes(Number(department.workspace_id))) {
      return res.status(403).json({ success: false, message: "Forbidden: Phòng ban không thuộc nơi làm việc của bạn." });
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
    try {
      await ensureManagerBelongsToWorkspace(manager_id, req.workspaceId);
    } catch (validationErr) {
      return res.status(validationErr.status || 400).json({ success: false, message: validationErr.message });
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
    const targetId = Number(req.params.id);
    const { parent_id, manager_id } = req.body || {};
    if (parent_id) {
      if ((await departmentWorkspace(parent_id)) !== req.workspaceId) {
        return res.status(400).json({ success: false, message: "Phòng ban cha không thuộc nơi làm việc này" });
      }
      if (await hasAncestorCycle(targetId, parent_id)) {
        return res.status(400).json({ success: false, message: "Không thể chọn chính phòng ban này hoặc đơn vị con làm phòng ban cha" });
      }
    }
    if (Object.prototype.hasOwnProperty.call(req.body || {}, "manager_id")) {
      try {
        await ensureManagerBelongsToWorkspace(manager_id, req.workspaceId);
      } catch (validationErr) {
        return res.status(validationErr.status || 400).json({ success: false, message: validationErr.message });
      }
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
