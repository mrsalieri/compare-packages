const util = require("util");
const { exec } = require("child_process");
const Joi = require("@hapi/joi");
const moment = require("moment");
const config = require("config");
const { httpReq } = require("../utils/httpReq");
const { Repo } = require("../models/repo");
const { Package } = require("../models/package");

const execPromise = util.promisify(exec);

const registryConfig = config.get("Registry");

module.exports = {
  getLatestPackageVersion: async (name, registry) => {
    try {
      let response = { data: null, error: new Error("registry_error") };

      if (registry === "npm") {
        response = await module.exports.getNpmPackageVersion(name);
      } else if (registry === "composer") {
        response = await module.exports.getComposerPackageVersion(name);
      }

      return response;
    } catch (e) {
      return { data: null, error: e };
    }
  },

  getNpmPackageVersion: async name => {
    const cmd = `npm view ${name} version`;
    const { stdout } = await execPromise(cmd);

    return stdout;
  },

  extractComposerPackageVersion: apiResponse => {
    const versionInfo = Object.values(apiResponse.data.package.versions);

    let latestVersion = "";
    for (let x = 0; x < versionInfo.length; x += 1) {
      const versionNormalized = versionInfo[x].version_normalized;

      // normalized version match, i.e 1.2.3.0
      const regex = /^(\d+\.)(\d+\.)(\d+\.)(\d)$/;
      const versionMatch = versionNormalized.match(regex);

      if (Array.isArray(versionMatch)) {
        // substring to remove the 4th degree version
        const version = versionMatch[0].substring(
          0,
          versionMatch[0].length - 2
        );

        if (version > latestVersion) {
          latestVersion = version;
        }
      }
    }

    return latestVersion;
  },

  getComposerPackageVersion: async name => {
    const apiUrl = config.get("Apis.packagist.url");

    const apiResponse = await httpReq({
      method: "get",
      url: `${apiUrl}/packages/${name}.json`,
      timeout: 10000
    });

    const version = module.exports.extractComposerPackageVersion(apiResponse);

    return version;
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

      const updateParams = {
        packages: updatedPackages,
        last_updated: moment().utc()
      };

      Object.assign(repo, updateParams);
      await repo.save();
      return { data: "success", error: null };
    } catch (e) {
      return { data: null, error: e };
    }
  },

  upsertPackageVersions: async packageGroup => {
    try {
      const packagesInDB = await Package.find();

      // Find missing packages and create full list
      const completePackageList = packageGroup.map(pack => {
        const matchedPackage = packagesInDB.find(recordedPackage => {
          return (
            recordedPackage.name === pack.name &&
            recordedPackage.registry === pack.registry
          );
        });

        if (!matchedPackage) {
          const params = {
            name: pack.name,
            registry: pack.registry,
            version: "",
            last_updated: moment().utc()
          };
          return new Package(params);
        }

        return matchedPackage;
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
      const packageVersionPromises = packagesWillBeUpdated.map(pack => {
        return module.exports.getLatestPackageVersion(pack.name, pack.registry);
      });
      const latestPackageVersions = await Promise.all(packageVersionPromises);

      // Update versions of packages
      const packageUpdatePromises = [];
      for (let idx = 0; idx < packagesWillBeUpdated.length; idx += 1) {
        const pack = packagesWillBeUpdated[idx];
        let registryVersion = "0";

        const { data } = latestPackageVersions[idx];
        if (data) {
          registryVersion = data.trim();
        }

        pack.version = registryVersion;
        pack.last_updated = moment().utc();

        packageUpdatePromises.push(pack.save());
      }

      await Promise.all(packageUpdatePromises);

      return { data: completePackageList, error: null };
    } catch (e) {
      return { data: null, error: e };
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
