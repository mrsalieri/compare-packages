const config = require("config");

module.exports = () => {
  if (!config.get("FileNames")) {
    throw new Error("FATAL ERROR: FileNames are not defined in config");
  }
};
