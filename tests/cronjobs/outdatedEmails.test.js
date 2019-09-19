require("dotenv").config();
const moment = require("moment");
const config = require("config");
require("../../init/db")();
require("../../init/instances");
const { Repo } = require("../../models/repo");
const { repoController } = require("../../utils/instances");

const testEmail = config.get("TestEmail");

jest.setTimeout(120000);

describe("Cronjobs.sendOutdatedEmails", () => {
  let nameIn;
  let namespaceIn;

  afterEach(async () => {
    await Repo.deleteMany({});
  });

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
          name: "mongoose",
          registry: "npm",
          repo_version: "1.0.0",
          registry_version: "1.1.2"
        }
      ]
    };
    const newRepo = new Repo();

    Object.assign(newRepo, params);
    await newRepo.save();

    const response = await repoController.sendOutdatedEmails();
    const result = response.data.filter(res => res.error !== null);

    expect(result.length).toBe(0);
  });
});
