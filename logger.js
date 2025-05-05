const fs = require("fs");
const path = require("path");

const logFilePath = path.join(__dirname, "logs.txt");

function logToFile(message) {
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  const logEntry = `[${timestamp}] ${message}\n`;

  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) {
      console.error("Failed to write to log file:", err);
    }
  });
}

module.exports = logToFile;
