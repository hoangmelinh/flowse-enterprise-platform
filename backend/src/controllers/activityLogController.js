import {
  findActivitiesByTaskId,
  createActivity,
  findActivitiesByUserId,
  findActivitiesBySpaceId,
  findActivitiesByWorkspaceId,
} from "../models/ActivityLogs.js";
import Department from "../models/Department.js";

export const getActivitiesByTaskId = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!taskId) {
      return res.status(400).json({ error: "Task ID is required" });
    }
    const activities = await findActivitiesByTaskId(taskId, parseInt(limit), parseInt(offset));
    res.status(200).json(activities);
  } catch (error) {
    console.error("Failed to retrieve activities:", error.message);
    res.status(500).json({ error: "Failed to retrieve activities" });
  }
};

export const createActivityLog = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { action, oldValue, newValue } = req.body;
    const userId = req.user?.user_id;

    if (!taskId) {
      return res.status(400).json({ error: "Task ID is required" });
    }
    if (!action) {
      return res.status(400).json({ error: "Action is required" });
    }

    const validActions = [
      'created', 'updated', 'deleted',
      'status_changed', 'priority_changed',
      'assigned', 'unassigned',
      'commented', 'attachment_added', 'attachment_removed',
      'due_date_changed', 'start_date_changed',
      'moved', 'archived', 'restored',
      'timer_started', 'timer_stopped',
      'sprint_assigned', 'milestone_assigned',
      'tag_added', 'tag_removed',
      'subtask_added', 'story_points_changed'
    ];

    if (!validActions.includes(action)) {
      return res.status(400).json({ 
        error: `Invalid action. Must be one of: ${validActions.join(', ')}` 
      });
    }

    const newActivity = await createActivity(taskId, userId, action, oldValue, newValue);
    res.status(201).json(newActivity);
  } catch (error) {
    console.error("Failed to create activity log:", error.message);
    res.status(500).json({ error: "Failed to create activity log" });
  }
};

export const getMyActivities = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    const { limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const activities = await findActivitiesByUserId(userId, parseInt(limit), parseInt(offset));
    res.status(200).json(activities);
  } catch (error) {
    console.error("Failed to retrieve user activities:", error.message);
    res.status(500).json({ error: "Failed to retrieve user activities" });
  }
};

export const getActivitiesBySpaceId = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!spaceId) {
      return res.status(400).json({ error: "Space ID is required" });
    }
    const activities = await findActivitiesBySpaceId(spaceId, parseInt(limit), parseInt(offset));
    res.status(200).json(activities);
  } catch (error) {
    console.error("Failed to retrieve space activities:", error.message);
    res.status(500).json({ error: "Failed to retrieve space activities" });
  }
};

export const getActivitiesByWorkspaceId = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { limit = 80, offset = 0, action = null, work_item_type = null, search = null } = req.query;
    const accessibleDeptIds = await Department.getAccessibleDepartmentIds(
      req.user.user_id,
      req.workspaceRole || null,
      Number(workspaceId)
    );
    const activities = await findActivitiesByWorkspaceId(workspaceId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      action: action || null,
      workItemType: work_item_type || null,
      search: search || null,
      accessibleDeptIds,
    });
    res.status(200).json({ success: true, data: activities });
  } catch (error) {
    console.error("Failed to retrieve workspace activities:", error.message);
    res.status(500).json({ error: "Failed to retrieve workspace activities" });
  }
};
