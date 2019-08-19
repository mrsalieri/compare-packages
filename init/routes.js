const express = require("express");
const swagger = require("../routes/swagger");
const repo = require("../routes/repo");
const errorMiddleware = require("../middlewares/error");
const notFoundMiddleware = require("../middlewares/notFound");

module.exports = app => {
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json()); // request parsing
  app.use("/api/repo", repo);
  app.use("/api/swagger", swagger); // interface and documentation
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
};
