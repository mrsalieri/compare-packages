require("dotenv").config();
require("../init/db")();
const { Repo } = require("../models/repo");
const { Package } = require("../models/package");

beforeAll(async () => {
  await Repo.deleteMany({});
  await Package.deleteMany({});
});

afterAll(async () => {
  await Repo.deleteMany({});
  await Package.deleteMany({});
});
