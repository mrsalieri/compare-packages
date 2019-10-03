const request = require("supertest");
const config = require("config");
const server = require("../../server");
const { repoController } = require("../../utils/instances");

const testEmail = config.get("TestEmail");

describe("middlewares.error", () => {
  let input;

  afterEach(async () => {
    await server.close();
  });

  beforeEach(() => {
    input = {
      nameIn: "react",
      namespaceIn: "facebook",
      emailListIn: [testEmail]
    };
  });

  const exec = () => {
    return request(server)
      .post("/api/repo/addemail")
      .send(input);
  };

  it("status 500 unexpected error", async () => {
    repoController.upsertRepoDataAndAppendEmail = () => {
      throw new Error("test error");
    };

    const res = await exec();

    expect(res.status).toBe(500);
  });
});
