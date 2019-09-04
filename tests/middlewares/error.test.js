const request = require("supertest");
const server = require("../../server");
const { repoController } = require("../../utils/instances");

describe("middlewares.error", () => {
  let json;

  afterEach(async () => {
    await server.close();
  });

  beforeEach(() => {
    json = {};
  });

  const exec = () => {
    return request(server)
      .post("/api/repo/addemail")
      .send(json);
  };

  it("status 500 unexpected error", async () => {
    repoController.addEmailToRepo = () => {
      throw new Error("test error");
    };

    const res = await exec();

    expect(res.status).toBe(500);
  });
});
