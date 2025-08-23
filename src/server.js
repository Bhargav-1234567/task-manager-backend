const express = require("express");
const cors = require("cors");
const connectDB = require("./config/database");
require("./utils/loadenv");

// Connect to database
connectDB();

// Route files
const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/task");
const customSectionRoutes = require("./routes/customSection");
const seedDefaultSections = require("./utils/seedDefaultSections");

const app = express();
// Seed default sections
seedDefaultSections();
// Middleware
app.use(cors());
app.use(express.json());

// Mount routers - make sure these are properly imported
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/sections", customSectionRoutes);

// Basic route
app.get("/", (req, res) => {
  res.json({ message: "Task Management API is running!" });
});

// Handle 404 errors
// app.use("*", (req, res) => {
//   res.status(404).json({ message: "Route not found" });
// });

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Error:", error);
  res.status(500).json({ message: "Server error" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
