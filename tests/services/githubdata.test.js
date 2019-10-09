require("dotenv").config();
require("../../init/db")();
const { upsertRepoFromGithub } = require("../../services/githubdata");

jest.setTimeout(60000);

describe("Services.githubdata", () => {
  it("success", async () => {
    const nameIn = "react";
    const namespaceIn = "facebook";

    const response = await upsertRepoFromGithub(nameIn, namespaceIn);

    expect(response.error).toBe(null);
  });

  it("error", async () => {
    const nameIn = "asdasda";
    const namespaceIn = "facebook";

    const response = await upsertRepoFromGithub(nameIn, namespaceIn);

    expect(response.error).not.toBe(null);
  });
});
