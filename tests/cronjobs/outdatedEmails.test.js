const moment = require("moment");
const config = require("config");
const { Repo } = require("../../models/repo");
const { sendOutdatedEmails } = require("../../controllers/repo");

const testEmail = config.get("TestEmail");

jest.setTimeout(10000);

describe("Cronjobs.sendOutdatedEmails", () => {
  let nameIn;
  let namespaceIn;

  beforeEach(() => {
    nameIn = "react";
    namespaceIn = "facebook";
  });

  it("success", async () => {
    const params = {
      name: nameIn,
      namespace: namespaceIn,
      active: true,
      last_updated: moment.utc(),
      emails: [testEmail],
      packages: [
        {
          name: "test",
          registry: "npm",
          repo_version: "1.1.1",
          registry_version: "1.1.2"
        }
      ]
    };
    const newRepo = new Repo();

    Object.assign(newRepo, params);
    await newRepo.save();

    const response = await sendOutdatedEmails();

    const result = response.filter(res => res.error !== null);

    expect(result.length).toBe(0);
  });
});
