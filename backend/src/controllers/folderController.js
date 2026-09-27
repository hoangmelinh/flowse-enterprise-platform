import {
  findFoldersBySpaceId,
  findFolderById,
  createFolder,
  updateFolder,
  deleteFolder,
} from "../models/Folders.js";
import { findListsByFolderId } from "../models/Lists.js";

// GET /api/v1/folders/spaces/:space_id
export const getFoldersBySpace = async (req, res) => {
  try {
    const { space_id } = req.params;
    const folders = await findFoldersBySpaceId(space_id);

    // Fetch lists for each folder
    const foldersWithLists = await Promise.all(
      folders.map(async (folder) => {
        const lists = await findListsByFolderId(folder.folder_id);
        return { ...folder, lists };
      })
    );

    res.status(200).json(foldersWithLists);
  } catch (error) {
    console.error("Error fetching folders:", error);
    res.status(500).json({ message: "Failed to fetch folders" });
  }
};

// GET /api/v1/folders/:folder_id
export const getFolderById = async (req, res) => {
  try {
    const { folder_id } = req.params;
    const folder = await findFolderById(folder_id);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }
    const lists = await findListsByFolderId(folder_id);
    res.status(200).json({ ...folder, lists });
  } catch (error) {
    console.error("Error fetching folder:", error);
    res.status(500).json({ message: "Failed to fetch folder" });
  }
};

// POST /api/v1/folders/spaces/:space_id
export const createNewFolder = async (req, res) => {
  try {
    const { space_id } = req.params;
    const { name } = req.body;
    const created_by = req.user?.user_id || null;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    const folder = await createFolder(space_id, name.trim(), created_by);
    res.status(201).json({ ...folder, lists: [] });
  } catch (error) {
    console.error("Error creating folder:", error);
    res.status(500).json({ message: "Failed to create folder" });
  }
};

// PUT /api/v1/folders/:folder_id
export const updateFolderById = async (req, res) => {
  try {
    const { folder_id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    const folder = await updateFolder(folder_id, name.trim());
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }
    res.status(200).json(folder);
  } catch (error) {
    console.error("Error updating folder:", error);
    res.status(500).json({ message: "Failed to update folder" });
  }
};

// DELETE /api/v1/folders/:folder_id
export const deleteFolderById = async (req, res) => {
  try {
    const { folder_id } = req.params;
    const folder = await deleteFolder(folder_id);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }
    res.status(200).json({ message: "Folder deleted successfully" });
  } catch (error) {
    console.error("Error deleting folder:", error);
    res.status(500).json({ message: "Failed to delete folder" });
  }
};
