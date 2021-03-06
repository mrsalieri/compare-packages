require("dotenv").config();
const moment = require("moment");
const config = require("config");
require("../../init/db")();
const { updateRegistryVersionsOfRepo } = require("../../services/registrydata");
const { Repo } = require("../../models/repo");
const { Package } = require("../../models/package");

const testEmail = config.get("TestEmail");

jest.setTimeout(60000);

describe("Services.registrydata", () => {
  afterEach(async () => {
    await Repo.deleteMany({});
    await Package.deleteMany({});
  });

  it("success", async () => {
    const nameIn = "react";
    const namespaceIn = "facebook";

    const params = {
      name: nameIn,
      namespace: namespaceIn,
      active: true,
      emails: [testEmail],
      last_updated: moment.utc(),
      packages: [
        {
          name: "bootstrap",
          registry: "npm",
          repo_version: "1.0.0",
          registry_version: ""
        },
        {
          name: "laravel/laravel",
          registry: "composer",
          repo_version: "1.0.0",
          registry_version: ""
        }
      ]
    };

    const newRepo = new Repo();
    Object.assign(newRepo, params);

    await newRepo.save();

    const response = await updateRegistryVersionsOfRepo({
      name: nameIn,
      namespace: namespaceIn
    });

    expect(response.error).toBe(null);
  });

  it("error", async () => {
    const nameIn = "asdasda";
    const namespaceIn = "facebook";

    const response = await updateRegistryVersionsOfRepo({
      nameIn,
      namespaceIn
    });

    expect(response.error).not.toBe(null);
  });
});
