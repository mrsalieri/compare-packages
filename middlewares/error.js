const winston = require("winston");

module.exports = (err, req, res, next) => {
  if (!err) {
    next();
  }
  winston.error(err.message, err);
  res.status(500).send("unexpected_error");
};
