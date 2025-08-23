const mongoose = require("mongoose");

const timeLogSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number, // in seconds
    },
  },
  {
    timestamps: true,
  }
);

// Create index for better performance
timeLogSchema.index({ taskId: 1 });
timeLogSchema.index({ userId: 1 });

// Calculate duration before saving
timeLogSchema.pre("save", function (next) {
  if (this.endTime && this.startTime) {
    this.duration = Math.round((this.endTime - this.startTime) / 1000); // Convert to seconds
  }
  next();
});

module.exports = mongoose.model("TimeLog", timeLogSchema);
