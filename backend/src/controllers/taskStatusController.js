import {
  findStatusesByListId,
  findStatusesBySpaceId,
  findStatusById,
  createStatus,
  updateStatusById,
  deleteStatusById,
  reorderStatuses,
} from "../models/TaskStatus.js";

export const getStatusesByListId = async (req, res) => {
  try {
    const { listId } = req.params;
    if (!listId) {
      return res.status(400).json({ error: "List ID is required" });
    }
    const statuses = await findStatusesByListId(listId);
    res.status(200).json(statuses);
  } catch (error) {
    console.error("Failed to retrieve statuses:", error.message);
    res.status(500).json({ error: "Failed to retrieve statuses" });
  }
};

export const getStatusesBySpaceId = async (req, res) => {
  try {
    const { spaceId } = req.params;
    if (!spaceId) {
      return res.status(400).json({ error: "Space ID is required" });
    }
    const statuses = await findStatusesBySpaceId(spaceId);
    res.status(200).json(statuses);
  } catch (error) {
    console.error("Failed to retrieve statuses by space:", error.message);
    res.status(500).json({ error: "Failed to retrieve statuses" });
  }
};

export const createTaskStatus = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { statusName, color, position, isDoneState, isDefault } = req.body;

    if (!spaceId) {
      return res.status(400).json({ error: "Space ID is required" });
    }
    if (!statusName) {
      return res.status(400).json({ error: "Status name is required" });
    }

    const newStatus = await createStatus(spaceId, statusName, color, position, isDoneState, isDefault);
    res.status(201).json(newStatus);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: "Status name already exists in this space" });
    }
    console.error("Failed to create status:", error.message);
    res.status(500).json({ error: "Failed to create status" });
  }
};

export const getStatusById = async (req, res) => {
  try {
    const { statusId } = req.params;
    if (!statusId) {
      return res.status(400).json({ error: "Status ID is required" });
    }
    const status = await findStatusById(statusId);
    if (!status) {
      return res.status(404).json({ error: "Status not found" });
    }
    res.status(200).json(status);
  } catch (error) {
    console.error("Failed to retrieve status:", error.message);
    res.status(500).json({ error: "Failed to retrieve status" });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const { statusName, color, isDoneState } = req.body;

    if (!statusId) {
      return res.status(400).json({ error: "Status ID is required" });
    }

    const updatedStatus = await updateStatusById(statusId, statusName, color, isDoneState);
    if (!updatedStatus) {
      return res.status(404).json({ error: "Status not found" });
    }
    res.status(200).json(updatedStatus);
  } catch (error) {
    console.error("Failed to update status:", error.message);
    res.status(500).json({ error: "Failed to update status" });
  }
};

export const deleteTaskStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    if (!statusId) {
      return res.status(400).json({ error: "Status ID is required" });
    }
    const deleted = await deleteStatusById(statusId);
    if (!deleted) {
      return res.status(404).json({ error: "Status not found" });
    }
    res.status(200).json({ message: "Status deleted successfully" });
  } catch (error) {
    console.error("Failed to delete status:", error.message);
    res.status(500).json({ error: "Failed to delete status" });
  }
};

export const reorderStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const { position } = req.body;

    if (!statusId) {
      return res.status(400).json({ error: "Status ID is required" });
    }
    if (position === undefined || position === null) {
      return res.status(400).json({ error: "Position is required" });
    }

    const reordered = await reorderStatuses(statusId, position);
    if (!reordered) {
      return res.status(404).json({ error: "Status not found" });
    }
    res.status(200).json(reordered);
  } catch (error) {
    console.error("Failed to reorder status:", error.message);
    res.status(500).json({ error: "Failed to reorder status" });
  }
};
