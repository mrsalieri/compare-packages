const moment = require("moment");
const config = require("config");
const { updateRegistryVersionsOfRepo } = require("../../services/registrydata");
const { Repo } = require("../../models/repo");
const { Package } = require("../../models/package");

const testEmail = config.get("TestEmail");

jest.setTimeout(10000);

describe("Services.registrydata", () => {
  let nameIn;
  let namespaceIn;

  beforeEach(() => {
    nameIn = "react";
    namespaceIn = "facebook";
  });

  afterEach(async () => {
    await Repo.remove({});
    await Package.remove({});
  });

  it("success", async () => {
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
          repo_version: "1.1.1",
          registry_version: ""
        }
      ]
    };
    const newRepo = new Repo();
    Object.assign(newRepo, params);
    await newRepo.save();

    const response = await updateRegistryVersionsOfRepo({
      nameIn,
      namespaceIn
    });

    expect(response.error).toBe(null);
  });

  it("error", async () => {
    nameIn = "asdasda";

    const response = await updateRegistryVersionsOfRepo({
      nameIn,
      namespaceIn
    });

    expect(response.error).not.toBe(null);
  });
});
