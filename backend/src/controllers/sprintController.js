import {
  findSprintsBySpaceIds,
  findSprintById,
  createSprintInSpace,
  updateSprintById,
  deleteSprintById,
} from "../models/Sprints.js";

export const getSprintsBySpaceId = async (req, res) => {
  try {
    const { spaceId } = req.params;
    if (!spaceId) {
      return res.status(400).json({ error: "Space ID is required" });
    }
    const sprints = await findSprintsBySpaceIds([spaceId]);
    res.status(200).json(sprints);
  } catch (error) {
    console.error("Failed to retrieve sprints:", error.message);
    res.status(500).json({ error: "Failed to retrieve sprints" });
  }
};

export const createSprint = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { name, description, goal, status, startDate, endDate } = req.body;

    if (!spaceId) {
      return res.status(400).json({ error: "Space ID is required" });
    }
    if (!name) {
      return res.status(400).json({ error: "Sprint name is required" });
    }

    // Validate status if provided
    const validStatuses = ['planning', 'active', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Validate date range
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: "Start date must be before end date" });
    }

    const createdBy = req.user?.user_id || null;
    const newSprint = await createSprintInSpace(
      spaceId,
      name,
      description,
      goal,
      status,
      startDate,
      endDate,
      createdBy
    );
    res.status(201).json(newSprint);
  } catch (error) {
    console.error("Failed to create sprint:", error.message);
    res.status(500).json({ error: "Failed to create sprint" });
  }
};

export const getSprintById = async (req, res) => {
  try {
    const { sprintId } = req.params;
    if (!sprintId) {
      return res.status(400).json({ error: "Sprint ID is required" });
    }
    const sprint = await findSprintById(sprintId);
    if (!sprint) {
      return res.status(404).json({ error: "Sprint not found" });
    }
    res.status(200).json(sprint);
  } catch (error) {
    console.error("Failed to retrieve sprint:", error.message);
    res.status(500).json({ error: "Failed to retrieve sprint" });
  }
};

export const updateSprint = async (req, res) => {
  try {
    const { sprintId } = req.params;
    const { name, description, goal, status, velocity, startDate, endDate } = req.body;

    if (!sprintId) {
      return res.status(400).json({ error: "Sprint ID is required" });
    }

    // Validate status if provided
    const validStatuses = ['planning', 'active', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Validate velocity if provided
    if (velocity !== undefined && velocity !== null && velocity < 0) {
      return res.status(400).json({ error: "Velocity must be a non-negative number" });
    }

    // Validate date range
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ error: "Start date must be before end date" });
    }

    const updatedSprint = await updateSprintById(
      sprintId,
      name,
      description,
      goal,
      status,
      velocity,
      startDate,
      endDate
    );
    if (!updatedSprint) {
      return res.status(404).json({ error: "Sprint not found" });
    }
    res.status(200).json(updatedSprint);
  } catch (error) {
    console.error("Failed to update sprint:", error.message);
    res.status(500).json({ error: "Failed to update sprint" });
  }
};

export const deleteSprint = async (req, res) => {
  try {
    const { sprintId } = req.params;
    if (!sprintId) {
      return res.status(400).json({ error: "Sprint ID is required" });
    }
    const deleted = await deleteSprintById(sprintId);
    if (!deleted) {
      return res.status(404).json({ error: "Sprint not found" });
    }
    res.status(200).json({ message: "Sprint deleted successfully" });
  } catch (error) {
    console.error("Failed to delete sprint:", error.message);
    res.status(500).json({ error: "Failed to delete sprint" });
  }
};