const ResponseData = require("../../libs/responseData");

describe("libs.responseData", () => {
  let body;

  beforeEach(() => {
    body = {
      status: 400,
      code: "error",
      data: {}
    };
  });

  it("constructor check", () => {
    const responseData = new ResponseData(body).getResponseData();

    expect(responseData).toEqual(body);
  });

  it("function checks", () => {
    const response = new ResponseData();

    const responseData = response
      .setStatus(body.status)
      .setCode(body.code)
      .setData(body.data)
      .getResponseData();

    expect(responseData).toEqual(body);
  });
});
