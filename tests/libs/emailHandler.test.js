require("dotenv").config();
const config = require("config");
const EmailHandler = require("../../libs/emailHandler");

const emailConf = config.get("Emails");
const testEmail = config.get("TestEmail");

jest.setTimeout(60000);

describe("libs.emailHandler", () => {
  it("success", async () => {
    const conf = { ...emailConf };

    const email = new EmailHandler()
      .setTransporter(conf.mailAuth)
      .setSubject("test email")
      .setFrom(conf.from)
      .setTo(testEmail)
      .setHtml("<p>Test Email</p>");

    const response = await email.sendEmail();
    expect(response.error).toBe(null);
  });

  it("error", async () => {
    const conf = { ...emailConf };
    conf.mailAuth = {};

    const email = new EmailHandler()
      .setTransporter(conf.mailAuth)
      .setSubject("test email")
      .setFrom("test@test.com")
      .setTo(testEmail)
      .setHtml("<p>Test Email</p>");

    const response = await email.sendEmail();
    expect(response.data).toBe(null);
  });
});
