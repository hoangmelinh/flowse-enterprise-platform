import {
  findListsByFolderId,
  findListsBySpaceId,
  findListById,
  createList,
  updateList,
  deleteList,
} from "../models/Lists.js";

// GET /api/v1/lists/folders/:folder_id
export const getListsByFolder = async (req, res) => {
  try {
    const { folder_id } = req.params;
    const lists = await findListsByFolderId(folder_id);
    res.status(200).json(lists);
  } catch (error) {
    console.error("Error fetching lists:", error);
    res.status(500).json({ message: "Failed to fetch lists" });
  }
};

// GET /api/v1/lists/spaces/:space_id
export const getListsBySpace = async (req, res) => {
  try {
    const { space_id } = req.params;
    const lists = await findListsBySpaceId(space_id);
    res.status(200).json(lists);
  } catch (error) {
    console.error("Error fetching lists:", error);
    res.status(500).json({ message: "Failed to fetch lists" });
  }
};

// GET /api/v1/lists/:list_id
export const getListById = async (req, res) => {
  try {
    const { list_id } = req.params;
    const list = await findListById(list_id);
    if (!list) {
      return res.status(404).json({ message: "List not found" });
    }
    res.status(200).json(list);
  } catch (error) {
    console.error("Error fetching list:", error);
    res.status(500).json({ message: "Failed to fetch list" });
  }
};

// POST /api/v1/lists
export const createNewList = async (req, res) => {
  try {
    const { space_id, folder_id, name } = req.body;
    const created_by = req.user?.user_id || null;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "List name is required" });
    }
    if (!space_id) {
      return res.status(400).json({ message: "space_id is required" });
    }

    const list = await createList(space_id, folder_id, name.trim(), created_by);
    res.status(201).json(list);
  } catch (error) {
    console.error("Error creating list:", error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to create list" });
  }
};

// PUT /api/v1/lists/:list_id
export const updateListById = async (req, res) => {
  try {
    const { list_id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "List name is required" });
    }

    const list = await updateList(list_id, name.trim());
    if (!list) {
      return res.status(404).json({ message: "List not found" });
    }
    res.status(200).json(list);
  } catch (error) {
    console.error("Error updating list:", error);
    res.status(500).json({ message: "Failed to update list" });
  }
};

// DELETE /api/v1/lists/:list_id
export const deleteListById = async (req, res) => {
  try {
    const { list_id } = req.params;
    const list = await deleteList(list_id);
    if (!list) {
      return res.status(404).json({ message: "List not found" });
    }
    res.status(200).json({ message: "List deleted successfully" });
  } catch (error) {
    console.error("Error deleting list:", error);
    res.status(500).json({ message: "Failed to delete list" });
  }
};

