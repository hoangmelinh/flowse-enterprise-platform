import {
  findTimeLogsByTaskId,
  findTimeLogsByUserId,
  findRunningTimer,
  startTimer,
  stopTimer,
  deleteTimeLog,
  getTotalTimeByTaskId,
} from "../models/TimeLogs.js";
import pool from "../config/connect.js";

export const getTimeLogsByTaskId = async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!taskId) {
      return res.status(400).json({ error: "Task ID is required" });
    }
    const timeLogs = await findTimeLogsByTaskId(taskId);
    res.status(200).json(timeLogs);
  } catch (error) {
    console.error("Failed to retrieve time logs:", error.message);
    res.status(500).json({ error: "Failed to retrieve time logs" });
  }
};

export const getMyTimeLogs = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const timeLogs = await findTimeLogsByUserId(userId);
    res.status(200).json(timeLogs);
  } catch (error) {
    console.error("Failed to retrieve user time logs:", error.message);
    res.status(500).json({ error: "Failed to retrieve user time logs" });
  }
};

export const getRunningTimer = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const timer = await findRunningTimer(userId);
    if (!timer) {
      return res.status(200).json(null);
    }
    res.status(200).json(timer);
  } catch (error) {
    console.error("Failed to retrieve running timer:", error.message);
    res.status(500).json({ error: "Failed to retrieve running timer" });
  }
};

export const startTimerForTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { note } = req.body;
    const userId = req.user?.user_id;

    if (!taskId) {
      return res.status(400).json({ error: "Task ID is required" });
    }
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Check if user already has a running timer
    const runningTimer = await findRunningTimer(userId);
    if (runningTimer) {
      return res.status(409).json({ 
        error: "You already have a running timer. Please stop it first.",
        runningTimer 
      });
    }

    const newTimer = await startTimer(taskId, userId, note);
    res.status(201).json(newTimer);
  } catch (error) {
    console.error("Failed to start timer:", error.message);
    res.status(500).json({ error: "Failed to start timer" });
  }
};

export const stopTimerById = async (req, res) => {
  try {
    const { timeLogId } = req.params;
    const userId = req.user?.user_id;

    if (!timeLogId) {
      return res.status(400).json({ error: "Time log ID is required" });
    }
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const stoppedTimer = await stopTimer(timeLogId, userId);
    if (!stoppedTimer) {
      return res.status(404).json({ error: "Running timer not found" });
    }
    res.status(200).json(stoppedTimer);
  } catch (error) {
    console.error("Failed to stop timer:", error.message);
    res.status(500).json({ error: "Failed to stop timer" });
  }
};

export const deleteTimeLogById = async (req, res) => {
  try {
    const { timeLogId } = req.params;
    const userId = req.user?.user_id;

    if (!timeLogId) {
      return res.status(400).json({ error: "Time log ID is required" });
    }
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Kiểm tra ownership: chỉ cho phép xóa time log của chính mình
    const ownerCheck = await pool.query(
      "SELECT user_id FROM time_logs WHERE time_log_id = $1",
      [timeLogId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Time log not found" });
    }
    if (ownerCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: "Forbidden: Bạn chỉ có thể xóa time log của chính mình." });
    }

    const deleted = await deleteTimeLog(timeLogId);
    if (!deleted) {
      return res.status(404).json({ error: "Time log not found" });
    }
    res.status(200).json({ message: "Time log deleted successfully" });
  } catch (error) {
    console.error("Failed to delete time log:", error.message);
    res.status(500).json({ error: "Failed to delete time log" });
  }
};

export const getTotalTime = async (req, res) => {
  try {
    const { taskId } = req.params;
    if (!taskId) {
      return res.status(400).json({ error: "Task ID is required" });
    }
    const totalTime = await getTotalTimeByTaskId(taskId);
    res.status(200).json(totalTime);
  } catch (error) {
    console.error("Failed to get total time:", error.message);
    res.status(500).json({ error: "Failed to get total time" });
  }
};
