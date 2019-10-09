const request = require("supertest");
const config = require("config");
const server = require("../../server");
const { repoController } = require("../../utils/instances");

const testEmail = config.get("TestEmail");

describe("middlewares.error", () => {
  afterEach(async () => {
    await server.close();
  });

  const exec = input => {
    return request(server)
      .post("/api/repo/addemail")
      .send(input);
  };

  it("status 500 unexpected error", async () => {
    const input = {
      nameIn: "react",
      namespaceIn: "facebook",
      emailListIn: [testEmail]
    };

    repoController.upsertRepoDataAndAppendEmail = () => {
      throw new Error("test error");
    };

    const res = await exec(input);

    expect(res.status).toBe(500);
  });
});
