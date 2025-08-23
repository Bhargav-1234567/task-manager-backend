const dotenv = require("dotenv");

// Load environment variables
dotenv.config({ path: "./.env" });

// Optional: export a function or object
module.exports = {
  loaded: true,
  // or any other exports you need
};
