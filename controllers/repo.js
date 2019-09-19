const config = require("config");
const EmailHandler = require("../libs/emailHandler");
const { generateUniquePackageKey } = require("../models/package");
const { upsertPackageVersions } = require("../services/registrydata");
const { upsertRepoFromGithub } = require("../services/githubdata");

class RepoController {
  constructor(eventEmitter, repoModel) {
    this.eventEmitter = eventEmitter;
    this.Repo = repoModel.Repo;
    this.prepareOutdatedEmailHtml = repoModel.prepareOutdatedEmailHtml;
  }

  async addEmailToRepo({ name, namespace, emailGroup }) {
    // Create or update github package data
    const githubResponse = await upsertRepoFromGithub(name, namespace);
    if (githubResponse.error) {
      return {
        status: 404,
        code: githubResponse.error,
        data: null
      };
    }

    const repo = await this.Repo.findOne({ name, namespace });

    // merge arrays and satisfy uniqueness
    const emails = [...new Set([...repo.emails, ...emailGroup])];

    Object.assign(repo, { emails });
    await repo.save();

    this.eventEmitter.emit("upsert_repo", { name, namespace });

    // Send response
    return {
      status: 200,
      code: "success",
      data: null
    };
  }

  async getRepoDetails({ name, namespace }) {
    // Get data
    const repo = await this.Repo.findOne({
      name,
      namespace
    })
      .select("-emails")
      .lean();

    if (!repo) {
      return {
        status: 404,
        code: "repo_not_found",
        data: null
      };
    }

    // Response preparation
    const payload = {
      data: repo
    };

    // Send response
    return {
      status: 200,
      code: "success",
      data: payload
    };
  }

  async sendOutdatedEmails(filter) {
    try {
      const emailConf = config.get("Emails");

      let repoGroup = await this.Repo.find(filter);
      if (!repoGroup) {
        return { data: null, error: "no_repo_found" };
      }

      // Update all repo data before sending emails
      const repoUpserts = repoGroup.map(repo => {
        return upsertRepoFromGithub(repo.name, repo.namespace);
      });
      await Promise.all(repoUpserts);

      repoGroup = await this.Repo.find(filter);
      if (!repoGroup) {
        return { data: null, error: "unexpected_error" };
      }

      // Create an object that holds packages in repos uniquely
      const packageLookUp = repoGroup.reduce((initialLookUp, repo) => {
        repo.packages.reduce((acc, pack) => {
          const key = generateUniquePackageKey(pack);
          if (Object.prototype.hasOwnProperty.call(acc, key)) {
            return acc;
          }

          acc[key] = { name: pack.name, registry: pack.registry };
          return acc;
        }, initialLookUp);
        return initialLookUp;
      }, {});
      const packageGroup = Object.values(packageLookUp);

      // Insert or update info for all necessary packages before sending emails
      const updatedPackageGroup = await upsertPackageVersions(packageGroup);
      if (updatedPackageGroup.error) {
        return { data: null, error: updatedPackageGroup.error };
      }

      // Update package list object to hold the updated data
      for (let idx = 0; idx < updatedPackageGroup.data.length; idx += 1) {
        const pack = updatedPackageGroup.data[idx];
        const lookUpKey = generateUniquePackageKey(pack);
        packageLookUp[lookUpKey] = pack.toObject();
      }

      // Update repo package data
      const repoPackageUpdates = repoGroup.map(repo => {
        const { packages } = repo;
        const newPackages = [];

        for (let idx = 0; idx < packages.length; idx += 1) {
          const pack = packages[idx];
          const key = generateUniquePackageKey(pack);
          // Package list object is used like dictionary
          const registryVersion = packageLookUp[key].version;

          const newPack = {
            ...pack.toObject(),
            registry_version: registryVersion
          };
          newPackages.push(newPack);
        }

        Object.assign(repo, { packages: newPackages });
        return repo.save();
      });
      await Promise.all(repoPackageUpdates);

      repoGroup = await this.Repo.find(filter);
      if (!repoGroup) {
        return { data: null, error: "unexpected_error" };
      }

      // Send emails with necessary data
      const sendEmails = repoGroup.reduce((promises, repo) => {
        const { emails, name } = repo;
        const emailHtml = this.prepareOutdatedEmailHtml(repo);

        emails.reduce((acc, email) => {
          acc.push(
            new EmailHandler()
              .setTransporter(emailConf.mailAuth)
              .setSubject(`${emailConf.outdatedSubject} ${name}`)
              .setFrom(emailConf.from)
              .setTo(email)
              .setHtml(emailHtml)
              .sendEmail()
          );
          return acc;
        }, promises);
        return promises;
      }, []);

      const emailResponses = await Promise.all(sendEmails);

      return { data: emailResponses, error: null };
    } catch (e) {
      return { data: null, error: e.message };
    }
  }
}

module.exports = RepoController;
