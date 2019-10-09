const { updateRegistryVersionsOfRepo } = require("../services/registrydata");
const eventEmitter = require("../utils/eventEmitter");

module.exports = () => {
  eventEmitter.addListener("upsert_repo", async ({ name, namespace }) => {
    await updateRegistryVersionsOfRepo({ name, namespace });
  });
};
