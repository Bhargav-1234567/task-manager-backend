const Task = require("../models/Task");
const CustomSection = require("../models/CustomSection");

// Helper function to validate status
const validateStatus = async (userId, status) => {
  const validSections = await CustomSection.find({
    $or: [{ createdBy: userId }, { isDefault: true }],
  });

  const validStatuses = validSections.map((section) => section.name);
  return validStatuses.includes(status);
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
    const { title, description, status, priority, dueDate, assignees } =
      req.body;

    // Validate status
    if (status && !(await validateStatus(req.user._id, status))) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const task = await Task.create({
      title,
      description,
      status: status || "Open",
      priority: priority || "Normal",
      dueDate,
      assignees,
      createdBy: req.user._id,
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
    if (
      req.body.status &&
      !(await validateStatus(req.user._id, req.body.status))
    ) {
      return res.status(400).json({ message: "Invalid status" });
    }

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
    if (task.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

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
    const sections = await CustomSection.find({
      $or: [{ createdBy: req.user._id }, { isDefault: true }],
    }).sort({ isDefault: -1, createdAt: 1 });

    // Get all tasks for the user (either created by or assigned to)
    const tasks = await Task.find({
      $or: [{ createdBy: req.user._id }, { assignees: req.user._id }],
    })
      .populate("assignees", "name email avatar")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    // Group tasks by status and format the response
    const boardData = sections.map((section) => {
      const sectionTasks = tasks.filter((task) => task.status === section.name);

      return {
        id: section._id.toString(),
        title: section.name,
        color: section.color,
        tasks: sectionTasks.map((task) => ({
          id: task._id.toString(),
          title: task.title,
          description: task.description,
          dateRange: formatDateRange(task.dueDate),
          priority: task.priority,
          assignees: task.assignees.map((user) => ({
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            avatar: generateAvatarColor(user.name), // Helper function for avatar color
          })),
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
};
