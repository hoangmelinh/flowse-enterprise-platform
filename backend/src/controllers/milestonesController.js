import {
  findMilestonesBySpaceId,
  findMilestonesByListId,
  findMilestoneById,
  createMilestoneInSpace,
  createMilestoneInList,
  updateMilestoneById,
  deleteMilestoneById,
} from "../models/Milestones.js";

export const getMilestonesBySpaceId = async (req, res) => {
  try {
    const { spaceId } = req.params;
    if (!spaceId) {
      return res.status(400).json({ error: "Space ID is required" });
    }
    const milestones = await findMilestonesBySpaceId(spaceId);
    res.status(200).json(milestones);
  } catch (error) {
    console.error("Failed to retrieve milestones:", error.message);
    res.status(500).json({ error: "Failed to retrieve milestones" });
  }
};

export const getMilestonesByListId = async (req, res) => {
  try {
    const { listId } = req.params;
    if (!listId) {
      return res.status(400).json({ error: "List ID is required" });
    }
    const milestones = await findMilestonesByListId(listId);
    res.status(200).json(milestones);
  } catch (error) {
    console.error("Failed to retrieve milestones:", error.message);
    res.status(500).json({ error: "Failed to retrieve milestones" });
  }
};

export const createMilestone = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { name, description, status, color, dueDate } = req.body;

    if (!spaceId) {
      return res.status(400).json({ error: "Space ID is required" });
    }
    if (!name) {
      return res.status(400).json({ error: "Milestone name is required" });
    }

    // Validate status if provided
    const validStatuses = ['on_track', 'at_risk', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const createdBy = req.user?.user_id || null;
    const newMilestone = await createMilestoneInSpace(
      spaceId,
      name,
      description,
      status,
      color,
      dueDate,
      createdBy
    );
    res.status(201).json(newMilestone);
  } catch (error) {
    console.error("Failed to create milestone:", error.message);
    res.status(500).json({ error: "Failed to create milestone" });
  }
};

export const createMilestoneForList = async (req, res) => {
  try {
    const { listId } = req.params;
    const { name, description, status, color, dueDate } = req.body;

    if (!listId) {
      return res.status(400).json({ error: "List ID is required" });
    }
    if (!name) {
      return res.status(400).json({ error: "Milestone name is required" });
    }

    const validStatuses = ['on_track', 'at_risk', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const createdBy = req.user?.user_id || null;
    const newMilestone = await createMilestoneInList(
      listId,
      name,
      description,
      status,
      color,
      dueDate,
      createdBy
    );
    res.status(201).json(newMilestone);
  } catch (error) {
    console.error("Failed to create milestone:", error.message);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to create milestone" });
  }
};

export const getMilestoneById = async (req, res) => {
  try {
    const { milestoneId } = req.params;
    if (!milestoneId) {
      return res.status(400).json({ error: "Milestone ID is required" });
    }
    const milestone = await findMilestoneById(milestoneId);
    if (!milestone) {
      return res.status(404).json({ error: "Milestone not found" });
    }
    res.status(200).json(milestone);
  } catch (error) {
    console.error("Failed to retrieve milestone:", error.message);
    res.status(500).json({ error: "Failed to retrieve milestone" });
  }
};

export const updateMilestone = async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const { name, description, status, color, dueDate } = req.body;

    if (!milestoneId) {
      return res.status(400).json({ error: "Milestone ID is required" });
    }

    // Validate status if provided
    const validStatuses = ['on_track', 'at_risk', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updatedMilestone = await updateMilestoneById(
      milestoneId,
      name,
      description,
      status,
      color,
      dueDate
    );
    if (!updatedMilestone) {
      return res.status(404).json({ error: "Milestone not found" });
    }
    res.status(200).json(updatedMilestone);
  } catch (error) {
    console.error("Failed to update milestone:", error.message);
    res.status(500).json({ error: "Failed to update milestone" });
  }
};

export const deleteMilestone = async (req, res) => {
  try {
    const { milestoneId } = req.params;
    if (!milestoneId) {
      return res.status(400).json({ error: "Milestone ID is required" });
    }
    const deleted = await deleteMilestoneById(milestoneId);
    if (!deleted) {
      return res.status(404).json({ error: "Milestone not found" });
    }
    res.status(200).json({ message: "Milestone deleted successfully" });
  } catch (error) {
    console.error("Failed to delete milestone:", error.message);
    res.status(500).json({ error: "Failed to delete milestone" });
  }
};
