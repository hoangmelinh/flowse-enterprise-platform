import {
  findAllWorkspacesByUserId,
  createWorkspace,
  findWorkspaceMembers,
  findWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  findWorkspaceInvitations,
  createWorkspaceInvitation,
  acceptWorkspaceInvitation as acceptInvitation,
  rejectWorkspaceInvitation as rejectInvitation,
  addWorkspaceMember,
  removeWorkspaceMember,
  updateMemberRole,
  getRolePermissionMatrix,
  updateWorkspaceMemberProfile,
} from "../models/Workspaces.js";
import OperationsAnalytics from "../models/OperationsAnalytics.js";
import { getWorkspaceMemberRole } from "../middlewares/roleMiddlewares.js";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const getWorkspaces = async (req, res) => {
  try {
    const user_id = req.user?.user_id;
    if (!user_id)
      return res.status(401).json({ error: "Không xác định được người dùng" });
    const workspaces = await findAllWorkspacesByUserId(user_id);
    res.status(200).json(workspaces);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createWorkspaces = async (req, res) => {
  try {
    const { name, description, slug } = req.body;
    const owner_id = req.user?.user_id;

    if (!owner_id) {
      return res
        .status(401)
        .json({
          error: "Không xác định được người dùng. Vui lòng đăng nhập lại.",
        });
    }

    if (!name || typeof name !== "string" || name.trim() === "") {
      return res
        .status(400)
        .json({ error: "Tên Workspace là bắt buộc và không được để trống" });
    }
    if (!slug || !slugRegex.test(slug)) {
      return res
        .status(400)
        .json({
          error: 'Slug không hợp lệ (chỉ chấp nhận chữ thường, số và dấu "-")',
        });
    }

    const safeDescription =
      description && typeof description === "string"
        ? description.trim()
        : null;

    const workspace = await createWorkspace(
      name.trim(),
      safeDescription,
      slug.trim(),
      owner_id,
    );
    res.status(201).json(workspace);
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ error: "Slug này đã tồn tại, vui lòng chọn đường dẫn khác" });
    }
    console.error("Lỗi khi tạo Workspace:", error);
    res
      .status(500)
      .json({ error: "Đã có lỗi xảy ra từ máy chủ, vui lòng thử lại sau." });
  }
};

export const getWorkspaceById = async (req, res) => {
  try {
    const workspace_id = parseInt(req.params.workspaceId);
    if (isNaN(workspace_id)) {
      return res.status(400).json({ error: "ID Workspace không hợp lệ" });
    }

    const workspace = await findWorkspaceById(workspace_id);
    if (!workspace) {
      return res.status(404).json({ error: "Không tìm thấy Workspace" });
    }
    res.status(200).json(workspace);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateWorkspaces = async (req, res) => {
  try {
    const workspace_id = parseInt(req.params.workspaceId);
    if (isNaN(workspace_id)) {
      return res.status(400).json({ error: "ID Workspace không hợp lệ" });
    }

    const { name, description } = req.body;

    if (!name && description === undefined) {
      return res
        .status(400)
        .json({ error: "Cần cung cấp ít nhất tên hoặc mô tả để cập nhật" });
    }

    if (
      name !== undefined &&
      (typeof name !== "string" || name.trim() === "")
    ) {
      return res
        .status(400)
        .json({ error: "Tên Workspace không được để trống" });
    }

    const updatedWorkspace = await updateWorkspace(
      workspace_id,
      name?.trim(),
      description,
    );
    if (!updatedWorkspace) {
      return res
        .status(404)
        .json({ error: "Không tìm thấy Workspace để cập nhật" });
    }
    res.status(200).json(updatedWorkspace);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteWorkspaces = async (req, res) => {
  try {
    const workspace_id = parseInt(req.params.workspaceId);
    const owner_id = req.user?.user_id;

    if (!owner_id) {
      return res
        .status(401)
        .json({
          error: "Không xác định được người dùng. Vui lòng đăng nhập lại.",
        });
    }
    if (isNaN(workspace_id)) {
      return res.status(400).json({ error: "ID Workspace không hợp lệ" });
    }

    await deleteWorkspace(workspace_id, owner_id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getWorkspaceMembers = async (req, res) => {
  try {
    const workspace_id = parseInt(req.params.workspaceId);
    if (isNaN(workspace_id)) {
      return res.status(400).json({ error: "ID Workspace không hợp lệ" });
    }

    const members = await findWorkspaceMembers(workspace_id);
    res.status(200).json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRolesMatrix = async (_req, res) => {
  try {
    const matrix = await getRolePermissionMatrix();
    res.status(200).json({ success: true, data: matrix });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getWorkspaceInvitations = async (req, res) => {
  try {
    const workspace_id = parseInt(req.params.workspaceId);
    if (isNaN(workspace_id)) {
      return res.status(400).json({ error: "ID Workspace không hợp lệ" });
    }
    const invitations = await findWorkspaceInvitations(workspace_id);
    res.status(200).json({ success: true, data: invitations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const patchWorkspaceMember = async (req, res) => {
  try {
    const workspace_id = parseInt(req.params.workspaceId);
    const targetUserId = parseInt(req.params.userId);
    if (isNaN(workspace_id) || isNaN(targetUserId)) {
      return res.status(400).json({ message: "workspaceId hoặc userId không hợp lệ" });
    }

    const { role_name, department_id, is_active } = req.body || {};
    if (Number(targetUserId) === Number(req.user?.user_id)) {
      if (role_name && String(role_name).toLowerCase() !== "admin") {
        return res.status(400).json({ message: "Không thể tự hạ quyền Quản trị viên của chính bạn" });
      }
      if (is_active === false) {
        return res.status(400).json({ message: "Không thể tự khóa tài khoản của chính bạn" });
      }
    }

    const updated = await updateWorkspaceMemberProfile(workspace_id, targetUserId, {
      role_name,
      department_id,
      is_active,
    });
    if (!updated) {
      return res.status(404).json({ message: "Không tìm thấy thành viên trong Workspace" });
    }
    res.status(200).json({ success: true, message: "Cập nhật phân quyền thành viên thành công", data: updated });
  } catch (error) {
    const status =
      error.statusCode ||
      (error.message?.includes("không hợp lệ") || error.message?.includes("Phòng ban") ? 400 : 500);
    res.status(status).json({ message: error.message });
  }
};

export const getWorkspaceOperationsOverview = async (req, res, next) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId, 10);
    if (isNaN(workspaceId)) {
      return res.status(400).json({ success: false, message: "workspaceId không hợp lệ" });
    }
    const { period = "month", scope = "all", departmentId = null } = req.query;
    const role = req.workspaceRole || (await getWorkspaceMemberRole(req.user.user_id, workspaceId)) || "member";
    const data = await OperationsAnalytics.getWorkspaceOverview({
      workspaceId,
      userId: req.user.user_id,
      userRole: role,
      period: String(period),
      scope: String(scope),
      departmentId: departmentId ? String(departmentId) : null,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};


