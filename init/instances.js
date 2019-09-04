const RepoController = require("../controllers/repo");
const RepoModel = require("../models/repo");
const eventEmitter = require("../utils/eventEmitter");
const instances = require("../utils/instances");

instances.repoController = new RepoController(eventEmitter, RepoModel);
