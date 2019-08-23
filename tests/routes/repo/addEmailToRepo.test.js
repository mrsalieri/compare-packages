const request = require("supertest");
const config = require("config");
const { Repo } = require("../../../models/repo");
const { Package } = require("../../../models/package");
const server = require("../../../server");

const testEmail = config.get("TestEmail");

jest.setTimeout(60000);

describe("Routes.repo.addemail", () => {
  let json;

  afterEach(async () => {
    await Repo.remove({});
    await Package.remove({});
    await server.close();
  });

  beforeEach(() => {
    json = {
      nameIn: "react",
      namespaceIn: "facebook",
      emailListIn: [testEmail]
    };
  });

  const addEmail = () =>
    request(server)
      .post("/api/repo/addemail")
      .send(json);

  it("nameIn required with 400", async () => {
    delete json.nameIn;

    const res = await addEmail();

    expect(res.status).toBe(400);
  });

  it("namespaceIn required with 400", async () => {
    delete json.namespaceIn;

    const res = await addEmail();

    expect(res.status).toBe(400);
  });

  it("emailListIn required with 400", async () => {
    delete json.emailListIn;

    const res = await addEmail();

    expect(res.status).toBe(400);
  });

  it("emailListIn invalid email fail with 400", async () => {
    json.emailListIn = ["sd"];

    const res = await addEmail();

    expect(res.status).toBe(400);
  });

  it("emailListIn empty list fail with 400", async () => {
    json.emailListIn = [];

    const res = await addEmail();

    expect(res.status).toBe(400);
  });

  it("repo not found with 404", async () => {
    json.namespaceIn = "sadasaddasd";

    const res = await addEmail();

    expect(res.status).toBe(404);
  });

  it("success", async () => {
    const { nameIn, namespaceIn, emailListIn } = json;

    const res = await addEmail();
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
