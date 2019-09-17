const winston = require("winston");
const mongoose = require("mongoose");

const signals = ["SIGINT", "SIGTERM", "SIGQUIT"];

module.exports = server => {
  signals.forEach(sig => {
    process.on(sig, () => {
      // Stops the server from accepting new connections and finishes existing connections.
      server.close(err => {
        if (err) {
          winston.error(err);
          process.exit(1);
        }

        // close your database connection and exit with success
        mongoose.connection.close(() => {
          winston.info("Mongoose connection disconnected");
          process.exit(0);
        });
      });
    });
  });
};
