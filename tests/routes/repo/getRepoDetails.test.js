const moment = require("moment");
const request = require("supertest");
const config = require("config");
const { Repo } = require("../../../models/repo");
const server = require("../../../server");

const testEmail = config.get("TestEmail");

describe("Routes.repo.getdetails", () => {
  let json;

  afterEach(async () => {
    await Repo.deleteMany({});
    await server.close();
  });

  beforeEach(() => {
    json = {
      nameIn: "react",
      namespaceIn: "facebook"
    };
  });

  const getRepo = () =>
    request(server)
      .get("/api/repo/getdetails")
      .query(json);

  it("nameIn required with 400", async () => {
    delete json.nameIn;

    const res = await getRepo();

    expect(res.status).toBe(400);
  });

  it("namespaceIn required with 400", async () => {
    delete json.namespaceIn;

    const res = await getRepo();

    expect(res.status).toBe(400);
  });

  it("repo not found with 404", async () => {
    json.namespaceIn = "sadasaddasd";

    const res = await getRepo();

    expect(res.status).toBe(404);
  });

  it("success", async () => {
    const { nameIn, namespaceIn } = json;
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

    const res = await getRepo();

    expect(res.status).toBe(200);
  });
});
