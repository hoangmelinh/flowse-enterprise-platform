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
} from "../models/Workspaces.js";

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


