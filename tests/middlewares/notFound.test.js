const request = require("supertest");
const server = require("../../server");

describe("middlewares.notFound", () => {
  afterEach(async () => {
    await server.close();
  });

  const exec = input => {
    return request(server)
      .post("/api/gdhmgdggh")
      .send(input);
  };

  it("status 404 url not found", async () => {
    const input = {
      name: "test8054"
    };
    const res = await exec(input);

    expect(res.status).toBe(404);
  });
});
