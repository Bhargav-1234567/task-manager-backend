const CustomSection = require("../models/CustomSection");

const defaultSections = [
  { name: "Open", color: "#3B82F6", isDefault: true },
  { name: "In Progress", color: "#F59E0B", isDefault: true },
  { name: "Completed", color: "#10B981", isDefault: true },
  { name: "Blocked", color: "#EF4444", isDefault: true },
  { name: "On Hold", color: "#6B7280", isDefault: true },
];

const seedDefaultSections = async () => {
  try {
    for (const section of defaultSections) {
      await CustomSection.updateOne(
        { name: section.name, isDefault: true },
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
