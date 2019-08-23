require("dotenv").config();
require("../init/db")();
const { Repo } = require("../models/repo");
const { Package } = require("../models/package");

beforeAll(async () => {
  await Repo.remove({});
  await Package.remove({});
});

afterAll(async () => {
  await Repo.remove({});
  await Package.remove({});
});
