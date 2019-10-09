const request = require("supertest");
const config = require("config");
const { Repo } = require("../../../models/repo");
const { Package } = require("../../../models/package");
const server = require("../../../server");

const testEmail = config.get("TestEmail");

jest.setTimeout(60000);

describe("Routes.repo.addemail", () => {
  afterEach(async () => {
    await Repo.deleteMany({});
    await Package.deleteMany({});
    await server.close();
  });

  const addEmail = input =>
    request(server)
      .post("/api/repo/addemail")
      .send(input);

  it("nameIn required with 400", async () => {
    const input = {
      namespaceIn: "facebook",
      emailListIn: [testEmail]
    };

    const res = await addEmail(input);

    expect(res.status).toBe(400);
  });

  it("namespaceIn required with 400", async () => {
    const input = {
      nameIn: "react",
      emailListIn: [testEmail]
    };

    const res = await addEmail(input);

    expect(res.status).toBe(400);
  });

  it("emailListIn required with 400", async () => {
    const input = {
      nameIn: "react",
      namespaceIn: "facebook"
    };

    const res = await addEmail(input);

    expect(res.status).toBe(400);
  });

  it("emailListIn invalid email fail with 400", async () => {
    const input = {
      nameIn: "react",
      namespaceIn: "facebook",
      emailListIn: ["sd"]
    };

    const res = await addEmail(input);

    expect(res.status).toBe(400);
  });

  it("emailListIn empty list fail with 400", async () => {
    const input = {
      nameIn: "react",
      namespaceIn: "facebook",
      emailListIn: []
    };

    const res = await addEmail(input);

    expect(res.status).toBe(400);
  });

  it("repo not found with 404", async () => {
    const input = {
      nameIn: "react",
      namespaceIn: "sadasaddasd",
      emailListIn: [testEmail]
    };

    const res = await addEmail(input);

    expect(res.status).toBe(404);
  });

  it("success", async () => {
    const input = {
      nameIn: "react",
      namespaceIn: "facebook",
      emailListIn: [testEmail]
    };
    const { nameIn, namespaceIn, emailListIn } = input;

    const res = await addEmail(input);
    expect(res.status).toBe(200);

    const repo = await Repo.findOne({
      name: nameIn,
      namespace: namespaceIn
    }).lean();
    const { emails } = repo;

    expect(emails.length).toBe(1);
    expect(emails).toContain(emailListIn[0]);
  });
});
