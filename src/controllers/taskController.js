const Task = require("../models/Task");
const CustomSection = require("../models/CustomSection");
const dayjs = require("dayjs");

// Helper function to validate status
const validateStatus = async (userId, statusId) => {
  const section = await CustomSection.findById(statusId);

  if (!section) return false;

  if (section.isDefault || section.createdBy.toString() === userId.toString()) {
    return true;
  }

  return false;
};

// @desc    Get all tasks for authenticated user
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    const { status, priority, assignedTo, search } = req.query;
    let query = {
      $or: [{ createdBy: req.user._id }, { assignees: req.user._id }],
    };

    // Filter by status
    if (status && status !== "All") {
      query.status = status;
    }

    // Filter by priority
    if (priority && priority !== "All") {
      query.priority = priority;
    }

    // Filter by assigned user
    if (assignedTo) {
      query.assignees = assignedTo;
    }

    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const tasks = await Task.find(query)
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email");

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user owns the task or is assigned to it
    if (
      task.createdBy._id.toString() !== req.user._id.toString() &&
      !task.assignees.some(
        (user) => user._id.toString() === req.user._id.toString()
      )
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to access this task" });
    }

    res.json(task);
  } catch (error) {
    console.error("Get task error:", error);
    if (error.name === "CastError") {
      return res.status(404).json({ message: "Task not found" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      assignees,
      createdBy,
      containerId,
      sortIndex,
    } = req.body;

    // Validate status
    if (status && !(await validateStatus(createdBy, containerId))) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const task = await Task.create({
      title,
      description,
      status: status || "Open",
      containerId: containerId,
      priority: priority || "Normal",
      dueDate,
      assignees,
      createdBy: createdBy,
      sortIndex: sortIndex,
    });

    const populatedTask = await Task.findById(task._id)
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email");

    res.status(201).json(populatedTask);
  } catch (error) {
    console.error("Create task error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user owns the task
    // if (task.createdBy.toString() !== req.user._id.toString()) {
    //   return res.status(403).json({ message: "Not authorized" });
    // }

    // Validate status if provided
    // if (
    //   req.body.status &&
    //   !(await validateStatus(req.user._id, req.body.status))
    // ) {
    //   return res.status(400).json({ message: "Invalid status" });
    // }

    const updatedTask = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email");

    res.json(updatedTask);
  } catch (error) {
    console.error("Update task error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ message: messages.join(", ") });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user owns the task
    // if (task.createdBy.toString() !== req.user._id.toString()) {
    //   return res.status(403).json({ message: "Not authorized" });
    // }

    await Task.findByIdAndDelete(req.params.id);

    res.json({ message: "Task removed" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update task status (for drag & drop)
// @route   PATCH /api/tasks/:id/status
// @access  Private
const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user owns the task or is assigned to it
    if (
      task.createdBy.toString() !== req.user._id.toString() &&
      !task.assignees.some(
        (userId) => userId.toString() === req.user._id.toString()
      )
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Validate status
    if (!(await validateStatus(req.user._id, status))) {
      return res.status(400).json({ message: "Invalid status" });
    }

    task.status = status;
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email");

    res.json(populatedTask);
  } catch (error) {
    console.error("Update task status error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get tasks grouped by status (containers) for Kanban board
// @route   GET /api/tasks/board
// @access  Private
const getTasksBoard = async (req, res) => {
  try {
    // Get all sections (statuses) for the user
    const sections = await CustomSection.find().sort({
      isDefault: -1,
      createdAt: 1,
    });

    // Get all tasks for the user (either created by or assigned to)
    const tasks = await Task.find()
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    // Group tasks by status and format the response
    const boardData = sections.map((section) => {
      const sectionTasks = tasks.filter(
        (task) => task.containerId === section.id
      );
      return {
        id: section._id.toString(),
        title: section.title,
        color: section.color,
        tasks: sectionTasks.map((task) => ({
          containerId: section.id,
          id: task._id.toString(),
          title: task.title,
          status: section.title,
          description: task.description,
          dateRange: formatDateRange(task.dueDate),
          priority: task.priority,
          assignees: task.assignees.map((user) => ({
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            avatar: generateAvatarColor(user.name), // Helper function for avatar color
          })),
          sortIndex: task.sortIndex,
          dueDate: task.dueDate,
          timeTracked: task.timeTracked,
          attachments: task.attachments.length,
          comments: 0, // Placeholder - you can implement comments later
          likes: 0, // Placeholder - you can implement likes later
          createdAt: task.createdAt,
        })),
      };
    });

    res.json(boardData);
  } catch (error) {
    console.error("Get tasks board error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update multiple tasks sort indices (for drag & drop reordering)
// @route   PATCH /api/tasks/bulk-sort-update
// @access  Private
const bulkUpdateSortIndex = async (req, res) => {
  try {
    const { updates } = req.body; // Array of { taskId, sortIndex, containerId }

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: "Updates array is required" });
    }

    // Validate all tasks belong to user before making any changes
    const taskIds = updates.map((update) => update.taskId);
    const tasks = await Task.find({ _id: { $in: taskIds } });

    // Check if all tasks were found
    if (tasks.length !== taskIds.length) {
      return res.status(404).json({ message: "One or more tasks not found" });
    }

    // Validate user permissions for all tasks
    for (let task of tasks) {
      if (
        task.createdBy.toString() !== req.user._id.toString() &&
        !task.assignees.some(
          (userId) => userId.toString() === req.user._id.toString()
        )
      ) {
        return res.status(403).json({
          message: "Not authorized to update one or more tasks",
        });
      }
    }

    // Validate containers if containerId is being updated
    const containerUpdates = updates.filter((update) => update.containerId);
    if (containerUpdates.length > 0) {
      const containerIds = [
        ...new Set(containerUpdates.map((update) => update.containerId)),
      ];
      const containers = await CustomSection.find({
        _id: { $in: containerIds },
      });

      for (let containerId of containerIds) {
        if (!(await validateStatus(req.user._id, containerId))) {
          return res.status(400).json({
            message: `Invalid container: ${containerId}`,
          });
        }
      }
    }

    // Use bulk operations for efficiency
    const bulkOps = updates.map(({ taskId, sortIndex, containerId }) => {
      const updateFields = { sortIndex: sortIndex };

      // If moving between containers, update containerId and status
      if (containerId) {
        const container = CustomSection.findById(containerId);
        updateFields.containerId = containerId;
        updateFields.status = containerId; // Assuming status matches containerId
      }

      return {
        updateOne: {
          filter: { _id: taskId },
          update: updateFields,
        },
      };
    });

    const result = await Task.bulkWrite(bulkOps);

    // Return updated tasks
    const updatedTasks = await Task.find({ _id: { $in: taskIds } })
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email")
      .sort({ sortIndex: 1 });

    res.json({
      message: `Successfully updated ${result.modifiedCount} tasks`,
      modifiedCount: result.modifiedCount,
      tasks: updatedTasks,
    });
  } catch (error) {
    console.error("Bulk update sort index error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update sort indices for tasks in a specific container
// @route   PATCH /api/tasks/container/:containerId/reorder
// @access  Private
const reorderTasksInContainer = async (req, res) => {
  try {
    const { containerId } = req.params;
    const { taskOrders } = req.body; // Array of { taskId, sortIndex }

    if (!taskOrders || !Array.isArray(taskOrders)) {
      return res.status(400).json({ message: "taskOrders array is required" });
    }

    // Validate container exists and user has access
    if (!(await validateStatus(req.user._id, containerId))) {
      return res.status(400).json({ message: "Invalid container" });
    }

    // Get all tasks in the container that belong to the user
    const taskIds = taskOrders.map((order) => order.taskId);
    const tasks = await Task.find({
      _id: { $in: taskIds },
      containerId,
      $or: [{ createdBy: req.user._id }, { assignees: req.user._id }],
    });

    if (tasks.length !== taskIds.length) {
      return res.status(403).json({
        message: "Not authorized to update one or more tasks in this container",
      });
    }

    // Create bulk update operations
    const bulkOps = taskOrders.map(({ taskId, sortIndex }) => ({
      updateOne: {
        filter: {
          _id: taskId,
          containerId,
          $or: [{ createdBy: req.user._id }, { assignees: req.user._id }],
        },
        update: { sortIndex },
      },
    }));

    const result = await Task.bulkWrite(bulkOps);

    res.json({
      message: `Successfully reordered ${result.modifiedCount} tasks in container`,
      modifiedCount: result.modifiedCount,
      containerId,
    });
  } catch (error) {
    console.error("Reorder tasks error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper function to format date range
const formatDateRange = (dueDate) => {
  if (!dueDate) return "No due date";

  const now = new Date();
  const due = new Date(dueDate);
  const formattedDue = due.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });

  if (due < now) {
    return `Overdue: ${formattedDue}`;
  }

  return formattedDue;
};

// Helper function to generate avatar color based on name
const generateAvatarColor = (name) => {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-orange-500",
    "bg-indigo-500",
    "bg-red-500",
    "bg-yellow-500",
    "bg-teal-500",
    "bg-cyan-500",
  ];

  // Simple hash based on name to get consistent color for same user
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const startTimeTracking = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user owns the task or is assigned to it
    if (
      task.createdBy.toString() !== req.user._id.toString() &&
      !task.assignees.some(
        (userId) => userId.toString() === req.user._id.toString()
      )
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // NEW: Check if user already has an active time tracking session in any task
    const userActiveSessions = await getUserActiveSessions(req.user._id);

    // If user already has an active session, prevent starting a new one
    if (userActiveSessions.length > 0) {
      return res.status(400).json({
        message: "You already have an active time tracking session",
        activeSessions: userActiveSessions,
      });
    }

    // Check if there's already an active time tracking session for this user in this task
    const userActiveSessionInTask = task.timeTracking?.find(
      (session) =>
        session.isActive &&
        session.userId.toString() === req.user._id.toString()
    );

    if (userActiveSessionInTask) {
      return res.status(400).json({
        message:
          "You already have an active time tracking session for this task",
        activeSession: {
          startTime: userActiveSessionInTask.startTime,
          duration: dayjs().diff(
            dayjs(userActiveSessionInTask.startTime),
            "second"
          ),
        },
      });
    }

    // Create new time tracking session with user information
    const newSession = {
      userId: req.user._id,
      startTime: new Date(),
      isActive: true,
      duration: 0,
    };

    if (!task.timeTracking) {
      task.timeTracking = [];
    }

    task.timeTracking.push(newSession);
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email")
      .populate("timeTracking.userId", "name email");

    res.json({
      message: "Time tracking started",
      task: populatedTask,
      activeSession: newSession,
    });
  } catch (error) {
    console.error("Start time tracking error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Stop time tracking for a task
// @route   POST /api/tasks/:id/time/stop
// @access  Private
const stopTimeTracking = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user owns the task or is assigned to it
    if (
      task.createdBy.toString() !== req.user._id.toString() &&
      !task.assignees.some(
        (userId) => userId.toString() === req.user._id.toString()
      )
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Find active time tracking session for this user
    const activeSessionIndex = task.timeTracking?.findIndex(
      (session) =>
        session.isActive &&
        session.userId.toString() === req.user._id.toString()
    );

    if (activeSessionIndex === -1 || !task.timeTracking) {
      return res.status(400).json({
        message: "No active time tracking session found for this user",
      });
    }

    const activeSession = task.timeTracking[activeSessionIndex];
    const endTime = new Date();
    const sessionDuration = dayjs(endTime).diff(
      dayjs(activeSession.startTime),
      "second"
    );

    // Update the session
    task.timeTracking[activeSessionIndex] = {
      ...activeSession.toObject(),
      endTime,
      duration: sessionDuration,
      isActive: false,
    };

    // Update total time tracked for this task
    task.timeTracked = (task.timeTracked || 0) + sessionDuration;

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email")
      .populate("timeTracking.userId", "name email");

    res.json({
      message: "Time tracking stopped",
      task: populatedTask,
      sessionDuration,
      totalTimeTracked: task.timeTracked,
    });
  } catch (error) {
    console.error("Stop time tracking error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// @desc    Get time tracking status for a task
// @route   GET /api/tasks/:id/time/status
// @access  Private
const getTimeTrackingStatus = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user owns the task or is assigned to it
    if (
      task.createdBy.toString() !== req.user._id.toString() &&
      !task.assignees.some(
        (userId) => userId.toString() === req.user._id.toString()
      )
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Get active session for this user
    const userActiveSession = task.timeTracking?.find(
      (session) =>
        session.isActive &&
        session.userId.toString() === req.user._id.toString()
    );

    let currentDuration = 0;
    if (userActiveSession) {
      currentDuration = dayjs().diff(
        dayjs(userActiveSession.startTime),
        "second"
      );
    }

    // Get all user sessions in this task
    const userSessions =
      task.timeTracking?.filter(
        (session) => session.userId.toString() === req.user._id.toString()
      ) || [];

    // Calculate total time tracked by this user in this task
    const userTotalTimeTracked = userSessions.reduce((total, session) => {
      return total + (session.duration || 0);
    }, 0);

    res.json({
      isActive: !!userActiveSession,
      activeSession: userActiveSession
        ? {
            startTime: userActiveSession.startTime,
            currentDuration,
          }
        : null,
      totalTimeTracked: task.timeTracked || 0,
      userTotalTimeTracked,
      allSessions: userSessions,
    });
  } catch (error) {
    console.error("Get time tracking status error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get time tracking history for a task
// @route   GET /api/tasks/:id/time/history
// @access  Private
const getTimeTrackingHistory = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if user owns the task or is assigned to it
    if (
      task.createdBy.toString() !== req.user._id.toString() &&
      !task.assignees.some(
        (userId) => userId.toString() === req.user._id.toString()
      )
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Get sessions for this user only
    const userSessions =
      task.timeTracking?.filter(
        (session) =>
          session.userId &&
          session.userId.toString() === req.user._id.toString()
      ) || [];

    const formattedHistory = userSessions.map((session) => {
      // Calculate duration for active sessions
      let duration = session.duration || 0;
      if (session.isActive) {
        duration = Math.floor((new Date() - session.startTime) / 1000);
      }

      return {
        _id: session._id,
        userId: session.userId,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: duration,
        isActive: session.isActive,
        formattedDuration: formatDuration(duration),
        formattedStartTime: dayjs(session.startTime).format(
          "MMM DD, YYYY HH:mm"
        ),
        formattedEndTime: session.endTime
          ? dayjs(session.endTime).format("MMM DD, YYYY HH:mm")
          : null,
      };
    });

    // Calculate total time tracked by this user in this task
    const userTotalTimeTracked = userSessions.reduce((total, session) => {
      // For active sessions, calculate current duration
      if (session.isActive) {
        return total + Math.floor((new Date() - session.startTime) / 1000);
      }
      // For completed sessions, use stored duration
      return total + (session.duration || 0);
    }, 0);

    res.json({
      history: formattedHistory,
      totalTimeTracked: task.timeTracked || 0,
      userTotalTimeTracked,
      formattedTotalTime: formatDuration(task.timeTracked || 0),
      formattedUserTotalTime: formatDuration(userTotalTimeTracked),
    });
  } catch (error) {
    console.error("Get time tracking history error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// Helper function to format duration
// Utility function to format duration in seconds to HH:MM:SS format
const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return "00:00:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    secs.toString().padStart(2, "0"),
  ].join(":");
};
const getActiveTimeSessions = async (req, res) => {
  try {
    // Find all tasks where the user is either the creator or an assignee
    const tasks = await Task.find({
      $or: [{ createdBy: req.user._id }, { assignees: req.user._id }],
    }).select("title timeTracking");

    // Extract active sessions with task information
    const activeSessions = [];

    tasks.forEach((task) => {
      // Find active session for this user in this task
      const activeSession = task.timeTracking?.find(
        (session) =>
          session.isActive &&
          session.userId.toString() === req.user._id.toString()
      );

      // Calculate total time spent by this user on this task (all sessions)
      const userSessions =
        task.timeTracking?.filter(
          (session) => session.userId.toString() === req.user._id.toString()
        ) || [];

      const totalTimeOnTask = userSessions.reduce((total, session) => {
        // For active sessions, calculate current duration
        if (session.isActive) {
          return total + dayjs().diff(dayjs(session.startTime), "second");
        }
        // For completed sessions, use stored duration
        return total + (session.duration || 0);
      }, 0);

      if (activeSession) {
        activeSessions.push({
          taskId: task._id,
          taskTitle: task.title,
          startTime: activeSession.startTime,
          duration: totalTimeOnTask, // Total time user spent on this task
          sessionId: activeSession._id,
        });
      }
    });

    res.json({
      activeSessions,
      count: activeSessions.length,
    });
  } catch (error) {
    console.error("Get active time sessions error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// Utility function to get all active sessions for a user
const getUserActiveSessions = async (userId) => {
  const tasks = await Task.find({
    $or: [{ createdBy: userId }, { assignees: userId }],
    "timeTracking.isActive": true,
    "timeTracking.userId": userId,
  })
    .populate("timeTracking.userId", "name email")
    .select("title timeTracking");

  const activeSessions = [];

  tasks.forEach((task) => {
    const activeSession = task.timeTracking.find(
      (session) =>
        session.isActive && session.userId._id.toString() === userId.toString()
    );

    if (activeSession) {
      activeSessions.push({
        taskId: task._id,
        taskTitle: task.title,
        userId: activeSession.userId,
        startTime: activeSession.startTime,
        duration: dayjs().diff(dayjs(activeSession.startTime), "second"),
        sessionId: activeSession._id,
      });
    }
  });

  return activeSessions;
};

// @desc    Get user dashboard with tasks summary, time tracking, and all tasks
// @route   GET /api/dashboard/user-stats
// @access  Private
const getUserDashboard = async (req, res) => {
  try {
    // Find all tasks where the user is either the creator or an assignee
    const tasks = await Task.find({
      $or: [
        { createdBy: req.user._id },
        { assignees: req.user._id }
      ]
    })
    .populate("assignees", "name email avatar")
    .populate("createdBy", "name email")
    .populate("timeTracking.userId", "name email")
    .sort({ createdAt: -1 });

    // 1. Total number of tasks per status
    const tasksPerStatus = {};
    tasks.forEach(task => {
      if (!tasksPerStatus[task.status]) {
        tasksPerStatus[task.status] = 0;
      }
      tasksPerStatus[task.status]++;
    });

    // 2. All tasks time duration with task details for current user
    const tasksWithTime = tasks.map(task => {
      // Get sessions for current user only
      const userSessions = task.timeTracking?.filter(
        session => session.userId && session.userId._id.toString() === req.user._id.toString()
      ) || [];

      // Calculate total time spent by user on this task
      const totalTimeOnTask = userSessions.reduce((total, session) => {
        if (session.isActive) {
          return total + dayjs().diff(dayjs(session.startTime), 'second');
        }
        return total + (session.duration || 0);
      }, 0);

      // Get active session for current user
      const activeSession = userSessions.find(session => session.isActive);

      return {
        _id: task._id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        labels: task.labels,
        assignees: task.assignees,
        createdBy: task.createdBy,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        totalTimeOnTask: totalTimeOnTask,
        formattedTotalTime: formatDuration(totalTimeOnTask),
        hasActiveSession: !!activeSession,
        activeSession: activeSession ? {
          startTime: activeSession.startTime,
          currentDuration: dayjs().diff(dayjs(activeSession.startTime), 'second'),
          formattedCurrentDuration: formatDuration(dayjs().diff(dayjs(activeSession.startTime), 'second'))
        } : null,
        sessions: userSessions.map(session => ({
          _id: session._id,
          startTime: session.startTime,
          endTime: session.endTime,
          duration: session.isActive ? 
            dayjs().diff(dayjs(session.startTime), 'second') : 
            session.duration,
          isActive: session.isActive,
          formattedDuration: formatDuration(session.isActive ? 
            dayjs().diff(dayjs(session.startTime), 'second') : 
            session.duration),
          formattedStartTime: dayjs(session.startTime).format("MMM DD, YYYY HH:mm"),
          formattedEndTime: session.endTime ? 
            dayjs(session.endTime).format("MMM DD, YYYY HH:mm") : null
        }))
      };
    });

    // Calculate overall statistics
    const totalTasks = tasks.length;
    const totalTimeTracked = tasksWithTime.reduce((total, task) => total + task.totalTimeOnTask, 0);
    const activeSessionsCount = tasksWithTime.filter(task => task.hasActiveSession).length;

    res.json({
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email
      },
      summary: {
        totalTasks,
        tasksPerStatus,
        totalTimeTracked,
        formattedTotalTimeTracked: formatDuration(totalTimeTracked),
        activeSessionsCount
      },
      tasks: tasksWithTime
    });
  } catch (error) {
    console.error("Get user dashboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  getTasksBoard,
  bulkUpdateSortIndex,
  reorderTasksInContainer,
  startTimeTracking,
  stopTimeTracking,
  getTimeTrackingStatus,
  getTimeTrackingHistory,
  getActiveTimeSessions,
  getUserDashboard
};

//IMP BKP
// const getActiveTimeSessions = async (req, res) => {
//   try {
//     const activeSessions = await getUserActiveSessions(req.user._id);

//     res.json({
//       activeSessions,
//       count: activeSessions.length,
//     });
//   } catch (error) {
//     console.error("Get active time sessions error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// // Utility function to get all active sessions for a user with total task time
// const getUserActiveSessions = async (userId) => {
//   // Find all tasks where the user is either the creator or an assignee
//   const tasks = await Task.find({
//     $or: [{ createdBy: userId }, { assignees: userId }],
//   })
//     .populate("timeTracking.userId", "name email")
//     .select("title timeTracking");

//   const activeSessions = [];

//   tasks.forEach((task) => {
//     // Find active session for this user in this task
//     const activeSession = task.timeTracking.find(
//       (session) =>
//         session.isActive && session.userId._id.toString() === userId.toString()
//     );

//     // Calculate total time spent by this user on this task (all sessions)
//     const userSessions = task.timeTracking.filter(
//       (session) => session.userId._id.toString() === userId.toString()
//     );

//     const totalTimeOnTask = userSessions.reduce((total, session) => {
//       // For active sessions, calculate current duration
//       if (session.isActive) {
//         return total + dayjs().diff(dayjs(session.startTime), "second");
//       }
//       // For completed sessions, use stored duration
//       return total + (session.duration || 0);
//     }, 0);

//     if (activeSession) {
//       activeSessions.push({
//         taskId: task._id,
//         taskTitle: task.title,
//         userId: activeSession.userId,
//         startTime: activeSession.startTime,
//         currentDuration: dayjs().diff(dayjs(activeSession.startTime), "second"),
//         sessionId: activeSession._id,
//         totalTimeOnTask: totalTimeOnTask, // Total time user spent on this task
//         formattedTotalTimeOnTask: formatDuration(totalTimeOnTask), // Formatted version
//       });
//     } else if (totalTimeOnTask > 0) {
//       // Include tasks with no active session but with historical time
//       activeSessions.push({
//         taskId: task._id,
//         taskTitle: task.title,
//         userId: userId,
//         startTime: null,
//         currentDuration: 0,
//         sessionId: null,
//         totalTimeOnTask: totalTimeOnTask, // Total time user spent on this task
//         formattedTotalTimeOnTask: formatDuration(totalTimeOnTask), // Formatted version
//         hasHistory: true, // Flag to indicate this is historical data only
//       });
//     }
//   });

//   return activeSessions;
// };
