const express = require("express");
const {
  getSections,
  createSection,
  updateSection,
  deleteSection,
} = require("../controllers/customSectionController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.route("/").get(protect, getSections).post(protect, createSection);

router.route("/:id").put(protect, updateSection).delete(protect, deleteSection);

module.exports = router;
