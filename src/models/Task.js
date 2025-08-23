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
    priority: {
      type: String,
      enum: ["Low", "Normal", "High"],
      default: "Normal",
    },
    dueDate: {
      type: Date,
    },
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    timeTracked: {
      type: Number, // in seconds
      default: 0,
    },
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
taskSchema.index({ createdBy: 1, status: 1 });
taskSchema.index({ assignees: 1 });
taskSchema.index({ dueDate: 1 });

module.exports = mongoose.model("Task", taskSchema);
