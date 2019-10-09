const moment = require("moment");
const request = require("supertest");
const config = require("config");
const { Repo } = require("../../../models/repo");
const server = require("../../../server");

const testEmail = config.get("TestEmail");

describe("Routes.repo.getdetails", () => {
  afterEach(async () => {
    await Repo.deleteMany({});
    await server.close();
  });

  const getRepo = input =>
    request(server)
      .get("/api/repo/getdetails")
      .query(input);

  it("nameIn required with 400", async () => {
    const input = {
      namespaceIn: "facebook"
    };

    const res = await getRepo(input);

    expect(res.status).toBe(400);
  });

  it("namespaceIn required with 400", async () => {
    const input = {
      nameIn: "react"
    };

    const res = await getRepo(input);

    expect(res.status).toBe(400);
  });

  it("repo not found with 404", async () => {
    const input = {
      nameIn: "react",
      namespaceIn: "sadasfafa"
    };

    const res = await getRepo(input);

    expect(res.status).toBe(404);
  });

  it("success", async () => {
    const input = {
      nameIn: "react",
      namespaceIn: "facebook"
    };

    const { nameIn, namespaceIn } = input;

    const params = {
      name: nameIn,
      namespace: namespaceIn,
      active: true,
      emails: [testEmail],
      last_updated: moment.utc(),
      packages: [
        {
          name: "test",
          registry: "npm",
          repo_version: "1.1.1",
          registry_version: "1.1.1"
        }
      ]
    };
    const newRepo = new Repo(params);
    await newRepo.save();

    const res = await getRepo(input);

    expect(res.status).toBe(200);
  });
});
