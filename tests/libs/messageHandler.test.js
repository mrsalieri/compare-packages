const MessageHandler = require("../../libs/messageHandler");

describe("libs.messageHandler", () => {
  function Response() {
    function setStatus(statusCode) {
      this.statusCode = statusCode;
      return this;
    }

    function send(data) {
      this.data = data;
      return this;
    }

    this.status = setStatus;
    this.send = send;
  }

  it("status 200 message", () => {
    const body = {
      status: 200,
      code: "success",
      data: {}
    };
    const req = { body: {} };
    const res = new Response();

    new MessageHandler(req, res)
      .success()
      .setMessageCode(body.code)
      .setData(body)
      .handle();
    expect(res.statusCode).toBe(body.status);
    expect(res.data.data).toMatchObject(body);
  });

  it("status 400 message", () => {
    const body = {
      status: 400,
      code: "error",
      data: {}
    };
    const req = { body: {} };
    const res = new Response();

    new MessageHandler(req, res)
      .badRequest()
      .setMessageCode(body.code)
      .setData(body)
      .handle();
    expect(res.statusCode).toBe(body.status);
    expect(res.data.data).toMatchObject(body);
  });

  it("status 401 message", () => {
    const body = {
      status: 401,
      code: "error",
      data: {}
    };
    const req = { body: {} };
    const res = new Response();

    new MessageHandler(req, res)
      .unauthorized()
      .setMessageCode(body.code)
      .setData(body)
      .handle();
    expect(res.statusCode).toBe(body.status);
    expect(res.data.data).toMatchObject(body);
  });

  it("status 403 message", () => {
    const body = {
      status: 403,
      code: "error",
      data: {}
    };
    const req = { body: {} };
    const res = new Response();

    new MessageHandler(req, res)
      .forbidden()
      .setMessageCode(body.code)
      .setData(body)
      .handle();
    expect(res.statusCode).toBe(body.status);
    expect(res.data.data).toMatchObject(body);
  });

  it("status 404 message", () => {
    const body = {
      status: 404,
      code: "error",
      data: {}
    };
    const req = { body: {} };
    const res = new Response();

    new MessageHandler(req, res)
      .notFound()
      .setMessageCode(body.code)
      .setData(body)
      .handle();
    expect(res.statusCode).toBe(body.status);
    expect(res.data.data).toMatchObject(body);
  });
});
