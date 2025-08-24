const CustomSection = require("../models/CustomSection");

// @desc    Get all custom sections for user
// @route   GET /api/sections
// @access  Private
const getSections = async (req, res) => {
  try {
    const sections = await CustomSection.find({
      $or: [{ createdBy: req.user._id }, { isDefault: true }],
    }).sort({ isDefault: -1, createdAt: 1 });

    res.json(sections);
  } catch (error) {
    console.error("Get sections error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Create custom section
// @route   POST /api/sections
// @access  Private
const createSection = async (req, res) => {
  try {
    const { title, color } = req.body;

    const section = await CustomSection.create({
      title: title,
      color: color || "#3B82F6",
      createdBy: req?.user?._id,
      tasks: [],
    });

    res.status(201).json(section);
  } catch (error) {
    console.error("Create section error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Section name already exists" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update custom section
// @route   PUT /api/sections/:id
// @access  Private
const updateSection = async (req, res) => {
  try {
    const section = await CustomSection.findById(req.params.id);

    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    // Check if user owns the section
    if (section.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Prevent updating default sections
    if (section.isDefault) {
      return res
        .status(400)
        .json({ message: "Cannot update default sections" });
    }

    const updatedSection = await CustomSection.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json(updatedSection);
  } catch (error) {
    console.error("Update section error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Section name already exists" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete custom section
// @route   DELETE /api/sections/:id
// @access  Private
const deleteSection = async (req, res) => {
  try {
    const section = await CustomSection.findById(req.params.id);

    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    // Check if user owns the section
    // if (section.createdBy.toString() !== req.user._id.toString()) {
    //   return res.status(403).json({ message: "Not authorized" });
    // }

    // Prevent deleting default sections
    if (section.isDefault) {
      return res
        .status(400)
        .json({ message: "Cannot delete default sections" });
    }

    await CustomSection.findByIdAndDelete(req.params.id);

    res.json({ message: "Section removed" });
  } catch (error) {
    console.error("Delete section error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getSections,
  createSection,
  updateSection,
  deleteSection,
};
