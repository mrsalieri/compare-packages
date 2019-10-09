const ResponseData = require("../../libs/responseData");

describe("libs.responseData", () => {
  it("constructor check", () => {
    const body = {
      status: 400,
      code: "error",
      data: {}
    };

    const responseData = new ResponseData(body).getResponseData();

    expect(responseData).toEqual(body);
  });

  it("function checks", () => {
    const body = {
      status: 400,
      code: "error",
      data: {}
    };

    const response = new ResponseData();

    const responseData = response
      .setStatus(body.status)
      .setCode(body.code)
      .setData(body.data)
      .getResponseData();

    expect(responseData).toEqual(body);
  });
});
