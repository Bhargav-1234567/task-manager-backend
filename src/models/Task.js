const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a task title"],
      trim: true,
      maxlength: [100, "Title cannot be more than 100 characters"],
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    status: {
      type: String,
      default: "Open",
    },
    containerId: {
      type: String,
      required: [true, "Container Id Required"],
    },
    priority: {
      type: String,
      enum: ["Low", "Normal", "High"],
      default: "Normal",
    },
    dueDate: {
      type: Date,
    },
    labels: {
      type: Array,
    },
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    sortIndex: { type: Number },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    timeTracking: [
      {
        startTime: {
          type: Date,
          required: true,
        },
        endTime: Date,
        duration: {
          type: Number, // duration in seconds
          default: 0,
        },
        isActive: {
          type: Boolean,
          default: false,
        },
      },
    ],
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Create index for better performance
// taskSchema.index({ createdBy: 1, status: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ "timeTracking.isActive": 1 });
// Pre-save middleware to ensure only one active time tracking session per task
taskSchema.pre("save", function (next) {
  if (this.timeTracking && this.timeTracking.length > 0) {
    const activeSessions = this.timeTracking.filter(
      (session) => session.isActive
    );
    if (activeSessions.length > 1) {
      return next(
        new Error("Only one active time tracking session allowed per task")
      );
    }
  }
  next();
});
module.exports = mongoose.model("Task", taskSchema);
