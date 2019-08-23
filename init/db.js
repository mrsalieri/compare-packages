const winston = require("winston");
const config = require("config");
const { mongoose } = require("../utils/db");

module.exports = () => {
  const db = config.get("DB.url");
  mongoose
    .connect(db, {
      // settings to disable deprecation warnings, may be removed in the future
      useNewUrlParser: true,
      useCreateIndex: true
    })
    .then(() => {
      if (process.env.NODE_ENV !== "test")
        winston.info(`Connected to ${db}...`);
    })
    .catch(err => {
      winston.error(err.message, err);
    });
};
