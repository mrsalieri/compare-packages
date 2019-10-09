const winston = require("winston");
const { CronJob } = require("cron");
const { repoController } = require("../utils/instances");

const { sendOutdatedEmails } = { repoController };

async function initilizeOutdatedEmailsJob() {
  const { data, error } = await sendOutdatedEmails();
  if (data) {
    const responseErrors = data.filter(res => res.error !== null);

    responseErrors.map(err => {
      winston.error("Outdated Email Error", err);
      return null;
    });

    winston.info("Outdated emails were sent");
    return null;
  }

  winston.error("Outdated Email Error", error);
  return null;
}

// IIFE for cron job
(() => {
  try {
    if (process.env.NODE_ENV !== "test") {
      // First param decides job pattern, check details at https://github.com/kelektiv/node-cron
      const job = new CronJob("00 00 00 * * *", async () => {
        initilizeOutdatedEmailsJob();
      });

      job.start();
      winston.info("Cron have started");
    }
  } catch (e) {
    winston.error(e.message, e);
  }
})();
