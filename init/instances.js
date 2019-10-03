const RepoController = require("../controllers/repo");
const RepoModel = require("../models/repo");
const ResponseData = require("../libs/responseData");
const eventEmitter = require("../utils/eventEmitter");
const instances = require("../utils/instances");

instances.repoController = new RepoController({
  eventEmitter,
  repoModel: RepoModel,
  responseData: ResponseData
});
