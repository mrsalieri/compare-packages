const config = require("config");
const EmailHandler = require("../libs/emailHandler");
const { generateUniquePackageKey } = require("../models/package");
const { upsertPackageVersions } = require("../services/registrydata");
const { upsertRepoFromGithub } = require("../services/githubdata");
const { objectHelper } = require("../utils/commonHelpers");

const { hasOwnPropertyCall } = objectHelper;

// Create an object that holds packages in repos uniquely, will be used as a look up table
function createPackageLookup(repoGroup) {
  const packageLookUp = repoGroup.reduce((initialLookUp, repo) => {
    repo.packages.reduce((acc, pack) => {
      const key = generateUniquePackageKey(pack);
      if (hasOwnPropertyCall(acc, key)) {
        return acc;
      }

      acc[key] = { name: pack.name, registry: pack.registry };
      return acc;
    }, initialLookUp);
    return initialLookUp;
  }, {});

  return packageLookUp;
}

async function upsertPackagesInLookUp(packageLookUp) {
  const packageGroup = Object.values(packageLookUp);

  const updatedPackageGroup = await upsertPackageVersions(packageGroup);
  if (updatedPackageGroup.error) {
    throw updatedPackageGroup.error;
  }

  return updatedPackageGroup.data;
}

function addVersionsToLookUp(packageLookUp, packageGroup) {
  const updatedPackageLookup = Object.assign({}, packageLookUp);

  for (let idx = 0; idx < packageGroup.length; idx += 1) {
    const pack = packageGroup[idx];
    const lookUpKey = generateUniquePackageKey(pack);
    updatedPackageLookup[lookUpKey] = pack.toObject();
  }

  return updatedPackageLookup;
}

function updatePackagesOfRepoWithLookUp(repo, packageLookUp) {
  const { packages } = repo;
  const newPackages = [];

  for (let idx = 0; idx < packages.length; idx += 1) {
    const pack = packages[idx];
    const key = generateUniquePackageKey(pack);

    const registryVersion = packageLookUp[key].version;

    const newPack = {
      ...pack.toObject(),
      registry_version: registryVersion
    };
    newPackages.push(newPack);
  }

  Object.assign(repo, { packages: newPackages });
  return repo.save();
}

class RepoController {
  constructor({ eventEmitter, repoModel, responseData }) {
    this.eventEmitter = eventEmitter;
    this.Repo = repoModel.Repo;
    this.prepareOutdatedEmailHtml = repoModel.prepareOutdatedEmailHtml;
    this.ResponseData = responseData;
  }

  async appendEmailToRepo({ name, namespace, emailGroup }) {
    const repo = await this.Repo.findOne({ name, namespace });

    // merge arrays and satisfy uniqueness
    const emails = [...new Set([...repo.emails, ...emailGroup])];

    Object.assign(repo, { emails });
    await repo.save();

    return repo;
  }

  async upsertRepoDataAndAppendEmail({ name, namespace, emailGroup }) {
    const responseData = new this.ResponseData();

    // Create or update github package data
    const githubResponse = await upsertRepoFromGithub(name, namespace);
    if (githubResponse.error) {
      return responseData
        .setStatus(404)
        .setCode("unexpected_error")
        .getResponseData();
    }

    await this.appendEmailToRepo({ name, namespace, emailGroup });

    this.eventEmitter.emit("upsert_repo", { name, namespace });

    return responseData
      .setStatus(200)
      .setCode("success")
      .getResponseData();
  }

  async getRepoDetails({ name, namespace }) {
    const responseData = new this.ResponseData();

    // Get data
    const repo = await this.Repo.findOne({
      name,
      namespace
    })
      .select("-emails")
      .lean();

    if (!repo) {
      return responseData
        .setStatus(404)
        .setCode("repo_not_found")
        .getResponseData();
    }

    // Response preparation
    const payload = {
      data: repo
    };

    // Send response
    return responseData
      .setStatus(200)
      .setCode("success")
      .setData(payload)
      .getResponseData();
  }

  async findRepos(repoFilter) {
    const repoGroup = await this.Repo.find(repoFilter);
    if (!repoGroup) {
      throw new Error("no_repo_found");
    }

    return repoGroup;
  }

  createOutdatedEmailPromisesForRepo(repo) {
    const emailConf = config.get("Emails");

    const { emails, name } = repo;
    const emailHtml = this.prepareOutdatedEmailHtml(repo);

    const promises = emails.reduce((accumulator, email) => {
      accumulator.push(
        new EmailHandler()
          .setTransporter(emailConf.mailAuth)
          .setSubject(`${emailConf.outdatedSubject} ${name}`)
          .setFrom(emailConf.from)
          .setTo(email)
          .setHtml(emailHtml)
          .sendEmail()
      );
      return accumulator;
    }, []);
    return promises;
  }

  async findAndSendOutdatedEmailsForRepos(repoFilter) {
    const reposToBeEmailed = await this.findRepos(repoFilter);

    const sendEmails = reposToBeEmailed.reduce((accumulator, repo) => {
      const promisesToBeAppended = this.createOutdatedEmailPromisesForRepo(
        repo
      );

      return accumulator.concat(promisesToBeAppended);
    }, []);

    const emailResponses = await Promise.all(sendEmails);
    return emailResponses;
  }

  async findAndUpsertRepos(repoFilter) {
    const reposToBeUpserted = await this.findRepos(repoFilter);

    const repoUpserts = reposToBeUpserted.map(repo => {
      return upsertRepoFromGithub(repo.name, repo.namespace);
    });

    const upsertedRepos = await Promise.all(repoUpserts);

    return upsertedRepos;
  }

  async findAndUpdatePackageAndRepoData(repoFilter) {
    await this.findAndUpsertRepos(repoFilter);

    const reposToBeUpdated = await this.findRepos(repoFilter);

    const packageLookUp = createPackageLookup(reposToBeUpdated);

    const updatedPackageGroup = await upsertPackagesInLookUp(packageLookUp);

    const updatedPackageLookup = addVersionsToLookUp(
      packageLookUp,
      updatedPackageGroup
    );

    const repoPackageUpdates = reposToBeUpdated.map(repo => {
      return updatePackagesOfRepoWithLookUp(repo, updatedPackageLookup);
    });
    const updatedData = await Promise.all(repoPackageUpdates);

    return updatedData;
  }

  async sendOutdatedEmails(repoFilter) {
    try {
      await this.findAndUpdatePackageAndRepoData(repoFilter);

      const emailResponses = await this.findAndSendOutdatedEmailsForRepos(
        repoFilter
      );

      return { data: emailResponses, error: null };
    } catch (e) {
      return { data: null, error: e.message };
    }
  }
}

module.exports = RepoController;
