const util = require("util");
const { exec } = require("child_process");
const Joi = require("@hapi/joi");
const moment = require("moment");
const config = require("config");
const { Repo } = require("../models/repo");
const { Package } = require("../models/package");

const execPromise = util.promisify(exec);

const registryConfig = config.get("Registry");

module.exports = {
  getLatestPackageVersion: async (name, registry) => {
    try {
      let cmd = "";
      if (registry === "npm") {
        cmd = `npm view ${name} version`;
      } else if (registry === "composer") {
        /*
          CANNOT FIND HOW TO RETRIEVE COMPOSER DATA
        */
      }
      const { stdout } = await execPromise(cmd);

      return { data: stdout, error: null };
    } catch (e) {
      return { data: null, error: e.message };
    }
  },

  updateRegistryVersionsOfRepo: async repoFilter => {
    try {
      const repo = await Repo.findOne(repoFilter);
      const { packages } = repo.toObject();

      // Update versions
      const completePackageList = await module.exports.upsertPackageVersions(
        packages
      );
      if (completePackageList.error) {
        return { data: null, error: completePackageList.error };
      }

      // Create updated package object for repo
      const updatedPackages = packages.map((pack, idx) => {
        return {
          ...pack,
          registry_version: completePackageList.data[idx].version
        };
      });

      const params = {
        packages: updatedPackages,
        last_updated: moment().utc()
      };

      Object.assign(repo, params);
      await repo.save();
      return { data: "success", error: null };
    } catch (e) {
      return { data: null, error: e.message };
    }
  },

  upsertPackageVersions: async packages => {
    try {
      const recordedPackages = await Package.find();

      // Find missing packages and create full list
      const completePackageList = packages.map(pack => {
        const match = recordedPackages.find(recordedPackage => {
          return (
            recordedPackage.name === pack.name &&
            recordedPackage.registry === pack.registry
          );
        });

        if (!match) {
          const params = {
            name: pack.name,
            registry: pack.registry,
            version: "",
            last_updated: moment().utc()
          };
          return new Package(params);
        }

        return match;
      });

      // List of packages that need version check
      const packagesWillBeUpdated = completePackageList.filter(pack => {
        const version = pack.version || "";
        const lastUpdated =
          moment.utc(pack.last_updated) || moment([1970, 0, 1]);
        const now = moment().utc();

        return (
          version === "" ||
          now.diff(lastUpdated, "minutes") >
            registryConfig.registryUpdateThreshold
        );
      });

      // Get recent versions from registries
      const packagePromises = packagesWillBeUpdated.map(pack => {
        return module.exports.getLatestPackageVersion(pack.name, pack.registry);
      });
      const packageResponses = await Promise.all(packagePromises);

      // Update versions of packages
      const updatedPackagePromises = [];
      for (let idx = 0; idx < packagesWillBeUpdated.length; idx += 1) {
        const pack = packagesWillBeUpdated[idx];
        let registryVersion = "0";

        const { data } = packageResponses[idx];
        if (data) {
          registryVersion = data.trim();
        }

        pack.version = registryVersion;
        pack.last_updated = moment().utc();

        updatedPackagePromises.push(pack.save());
      }
      await Promise.all(updatedPackagePromises);
      return { data: completePackageList, error: null };
    } catch (e) {
      return { data: null, error: e.message };
    }
  },

  validatePackageInput: (name, registry) => {
    const joiPackageSchema = Joi.object().keys({
      name: Joi.string().required(),
      registry: Joi.string()
        .valid(registryConfig.registryList)
        .required()
    });

    return Joi.validate({ name, registry }, joiPackageSchema);
  }
};
