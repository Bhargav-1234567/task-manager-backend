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
  startTimeTracking,
  stopTimeTracking,
  getTimeTrackingStatus,
  getTimeTrackingHistory,
  getActiveTimeSessions,
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

// Time tracking routes
router.post("/:id/time/start", protect, startTimeTracking);
router.post("/:id/time/stop", protect, stopTimeTracking);
router.get("/:id/time/status", protect, getTimeTrackingStatus);
router.get("/:id/time/history", protect, getTimeTrackingHistory);

router
  .route("/:id") // Make sure this colon is present
  .get(protect, getTask)
  .put(protect, updateTask)
  .delete(protect, deleteTask);

router.patch("/:id/status", protect, updateTaskStatus); // And here
router.get("/time-tracking/active-sessions", protect, getActiveTimeSessions);

module.exports = router;
