const request = require("supertest");
const config = require("config");
const { Repo } = require("../../../models/repo");
const { Package } = require("../../../models/package");
const server = require("../../../server");

const testEmail = config.get("TestEmail");

jest.setTimeout(60000);

describe("Routes.repo.addemail", () => {
  let input;

  afterEach(async () => {
    await Repo.deleteMany({});
    await Package.deleteMany({});
    await server.close();
  });

  beforeEach(() => {
    input = {
      nameIn: "react",
      namespaceIn: "facebook",
      emailListIn: [testEmail]
    };
  });

  const addEmail = () =>
    request(server)
      .post("/api/repo/addemail")
      .send(input);

  it("nameIn required with 400", async () => {
    delete input.nameIn;

    const res = await addEmail();

    expect(res.status).toBe(400);
  });

  it("namespaceIn required with 400", async () => {
    delete input.namespaceIn;

    const res = await addEmail();

    expect(res.status).toBe(400);
  });

  it("emailListIn required with 400", async () => {
    delete input.emailListIn;

    const res = await addEmail();

    expect(res.status).toBe(400);
  });

  it("emailListIn invalid email fail with 400", async () => {
    input.emailListIn = ["sd"];

    const res = await addEmail();

    expect(res.status).toBe(400);
  });

  it("emailListIn empty list fail with 400", async () => {
    input.emailListIn = [];

    const res = await addEmail();

    expect(res.status).toBe(400);
  });

  it("repo not found with 404", async () => {
    input.namespaceIn = "sadasaddasd";

    const res = await addEmail();

    expect(res.status).toBe(404);
  });

  it("success", async () => {
    const { nameIn, namespaceIn, emailListIn } = input;

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
