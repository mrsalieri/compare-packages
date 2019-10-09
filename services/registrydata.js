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

async function getNpmPackageVersion(name) {
  const cmd = `npm view ${name} version`;
  const { stdout } = await execPromise(cmd);

  return stdout;
}

function extractComposerPackageVersion(apiResponse) {
  const versionGroup = Object.values(apiResponse.data.package.versions);

  const latestVersion = versionGroup.reduce((accumulator, versionData) => {
    const versionNormalized = versionData.version_normalized;

    // normalized version match, i.e 1.2.3.0
    const regex = /^(\d+\.)(\d+\.)(\d+\.)(\d)$/;
    const versionMatch = versionNormalized.match(regex);

    if (Array.isArray(versionMatch)) {
      // substring to remove the 4th degree version
      const version = versionMatch[0].substring(0, versionMatch[0].length - 2);

      if (version > accumulator) {
        return version;
      }
    }

    return accumulator;
  }, "");

  return latestVersion;
}

async function requestPackagefromComposer(name) {
  try {
    const apiUrl = config.get("Apis.packagist.url");

    const apiResponse = await httpReq({
      method: "get",
      url: `${apiUrl}/packages/${name}.json`,
      timeout: 10000
    });

    return apiResponse;
  } catch (e) {
    throw new Error("package_not_found_on_composer");
  }
}

async function getComposerPackageVersion(name) {
  const apiResponse = await requestPackagefromComposer(name);

  const version = extractComposerPackageVersion(apiResponse);

  return version;
}

async function getLatestPackageVersion(name, registry) {
  try {
    let response = { data: null, error: new Error("registry_error") };

    if (registry === "npm") {
      response = await getNpmPackageVersion(name);
    } else if (registry === "composer") {
      response = await getComposerPackageVersion(name);
    }

    return { data: response, error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

async function generatePackageModelsMergedWithExistingData(packageGroup) {
  const packagesInDB = await Package.find();

  // Find missing packages and create full list
  const packageModels = packageGroup.map(pack => {
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

  return packageModels;
}

function doesPackageNeedUpdate(pack) {
  const version = pack.version || "";
  const lastUpdated = moment.utc(pack.last_updated) || moment([1970, 0, 1]);
  const now = moment().utc();

  return (
    version === "" ||
    now.diff(lastUpdated, "minutes") > registryConfig.registryUpdateThreshold
  );
}

async function updatePackageVersions(packageGroup) {
  const packageVersionPromises = packageGroup.map(pack => {
    return getLatestPackageVersion(pack.name, pack.registry);
  });
  const latestPackageVersions = await Promise.all(packageVersionPromises);

  const packageUpdatePromises = packageGroup.map((pack, idx) => {
    let registryVersion = "0";

    const { data } = latestPackageVersions[idx];
    if (data) {
      registryVersion = data.trim();
    }

    const updateParams = {
      version: registryVersion,
      last_updated: moment().utc()
    };

    Object.assign(pack, updateParams);

    return pack.save();
  });

  const updatedPackageGroup = await Promise.all(packageUpdatePromises);

  return updatedPackageGroup;
}

async function upsertPackageVersions(packageGroup) {
  try {
    const packageModels = await generatePackageModelsMergedWithExistingData(
      packageGroup
    );

    const packagesWillBeUpdated = packageModels.filter(pack => {
      return doesPackageNeedUpdate(pack);
    });

    await updatePackageVersions(packagesWillBeUpdated);

    return { data: packageModels, error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

async function updateRegistryVersionsOfRepo(repoFilter) {
  try {
    const repo = await Repo.findOne(repoFilter);
    const { packages } = repo.toObject();

    // Update versions
    const packageModels = await upsertPackageVersions(packages);
    if (packageModels.error) {
      return { data: null, error: packageModels.error };
    }

    // Create updated package object for repo
    const updatedPackages = packages.map((pack, idx) => {
      return {
        ...pack,
        registry_version: packageModels.data[idx].version
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
}

function validatePackageInput(name, registry) {
  const joiPackageSchema = Joi.object().keys({
    name: Joi.string().required(),
    registry: Joi.string()
      .valid(registryConfig.registryList)
      .required()
  });

  return Joi.validate({ name, registry }, joiPackageSchema);
}

module.exports = {
  getLatestPackageVersion,
  getNpmPackageVersion,
  extractComposerPackageVersion,
  requestPackagefromComposer,
  getComposerPackageVersion,
  updateRegistryVersionsOfRepo,
  upsertPackageVersions,
  validatePackageInput
};
