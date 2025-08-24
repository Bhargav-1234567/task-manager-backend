const CustomSection = require("../models/CustomSection");

const defaultSections = [
  { title: "Open", color: "#3B82F6", isDefault: true },
  { title: "In Progress", color: "#F59E0B", isDefault: true },
  { title: "Completed", color: "#10B981", isDefault: true },
  { title: "Blocked", color: "#EF4444", isDefault: true },
  { title: "On Hold", color: "#6B7280", isDefault: true },
];

const seedDefaultSections = async () => {
  try {
    for (const section of defaultSections) {
      await CustomSection.updateOne(
        { title: section.title, isDefault: true },
        { $setOnInsert: section },
        { upsert: true }
      );
    }
    console.log("Default sections seeded successfully");
  } catch (error) {
    console.error("Error seeding default sections:", error);
  }
};

module.exports = seedDefaultSections;
