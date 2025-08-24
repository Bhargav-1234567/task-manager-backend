const mongoose = require("mongoose");

const customSectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a section name"],
      trim: true,
      maxlength: [50, "Section name cannot be more than 50 characters"],
    },
    color: {
      type: String,
      default: "#3B82F6", // default blue color
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    tasks: {
      type: Array,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate section names for the same user
// customSectionSchema.index({ name: 1, createdBy: 1 }, { unique: true });

module.exports = mongoose.model("CustomSection", customSectionSchema);
