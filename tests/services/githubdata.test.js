require("dotenv").config();
require("../../init/db")();
const { upsertRepoFromGithub } = require("../../services/githubdata");

jest.setTimeout(60000);

describe("Services.githubdata", () => {
  let nameIn;
  let namespaceIn;

  beforeEach(() => {
    nameIn = "react";
    namespaceIn = "facebook";
  });

  it("success", async () => {
    const response = await upsertRepoFromGithub(nameIn, namespaceIn);

    expect(response.error).toBe(null);
  });

  it("error", async () => {
    nameIn = "asdasda";

    const response = await upsertRepoFromGithub(nameIn, namespaceIn);

    expect(response.error).not.toBe(null);
  });
});
