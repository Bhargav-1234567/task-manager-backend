const Task = require("../models/Task");
const CustomSection = require("../models/CustomSection");

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
    if (task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

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
};
