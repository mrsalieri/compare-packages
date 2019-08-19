const nodemailer = require("nodemailer");

class EmailHandler {
  constructor() {
    this.transporter = null;
    this.emailOptions = {
      from: "",
      to: "",
      subject: "",
      text: "",
      html: ""
    };
  }

  setTransporter(auth) {
    this.transporter = nodemailer.createTransport(auth);
    return this;
  }

  setFrom(fromEmailAdress) {
    this.emailOptions.from = fromEmailAdress;
    return this;
  }

  setTo(toEmailAdress) {
    this.emailOptions.to = toEmailAdress;
    return this;
  }

  setSubject(subject) {
    this.emailOptions.subject = subject;
    return this;
  }

  setText(textContent) {
    this.emailOptions.text = textContent;
    return this;
  }

  setHtml(htmlContent) {
    this.emailOptions.html = htmlContent;
    return this;
  }

  async sendEmail() {
    try {
      const info = await this.transporter.sendMail(this.emailOptions);
      return { data: info, error: null };
    } catch (e) {
      return { data: null, error: e.message };
    }
  }
}

module.exports = EmailHandler;
