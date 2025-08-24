const express = require("express");
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  getTasksBoard,
  bulkUpdateSortIndex,
  reorderTasksInContainer,
} = require("../controllers/taskController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// All routes should start with /api/tasks
router.route("/").get(protect, getTasks).post(protect, createTask);

router.route("/board").get(protect, getTasksBoard);
router.patch("/bulk-sort-update", protect, bulkUpdateSortIndex);
router.patch(
  "/container/:containerId/reorder",
  protect,
  reorderTasksInContainer
);
router
  .route("/:id") // Make sure this colon is present
  .get(protect, getTask)
  .put(protect, updateTask)
  .delete(protect, deleteTask);

router.patch("/:id/status", protect, updateTaskStatus); // And here

module.exports = router;
