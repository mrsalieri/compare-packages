const winston = require("winston");
const { CronJob } = require("cron");
const { sendOutdatedEmails } = require("../controllers/repo");

// IIFE for cron job
(() => {
  if (process.env.NODE_ENV !== "test") {
    // First param decides job pattern, check details at https://github.com/kelektiv/node-cron
    const job = new CronJob("00 00 00 * * *", async () => {
      await sendOutdatedEmails();
      winston.info("Outdated emails were sent");
    });

    job.start();
    winston.info("Cron have started");
  }
})();
