const config = require("config");
const MessageHandler = require("../libs/messageHandler");
const EmailHandler = require("../libs/emailHandler");
const { generateUniquePackageKey } = require("../models/package");
const { upsertPackageVersions } = require("../services/registrydata");
const { upsertRepoFromGithub } = require("../services/githubdata");

class RepoController {
  constructor(ee, repoModel) {
    this.eventEmitter = ee;
    this.Repo = repoModel.Repo;
    this.prepareOutdatedEmailHtml = repoModel.prepareOutdatedEmailHtml;
  }

  async addEmailToRepo(input, res) {
    const { name, namespace, emailList } = input;

    // Create or update github package data
    const githubResponse = await upsertRepoFromGithub(name, namespace);
    if (githubResponse.error) {
      return new MessageHandler(input, res)
        .notFound()
        .setMessageCode(githubResponse.error)
        .handle();
    }

    const repo = await this.Repo.findOne({ name, namespace });

    // merge arrays and satisfy uniqueness
    const emails = [...new Set([...repo.emails, ...emailList])];

    Object.assign(repo, { emails });
    await repo.save();

    this.eventEmitter.emit("upsert_repo", { name, namespace });

    // Send response
    return new MessageHandler(input, res)
      .success()
      .setMessageCode("success")
      .handle();
  }

  async getRepoDetails(input, res) {
    const { name, namespace } = input;

    // Get data
    const repo = await this.Repo.findOne({
      name,
      namespace
    })
      .select("-emails")
      .lean();

    if (!repo) {
      return new MessageHandler(input, res)
        .notFound()
        .setMessageCode("repo_not_found")
        .handle();
    }

    // Response preparation
    const payload = {
      data: repo
    };

    // Send response
    return new MessageHandler(input, res)
      .success()
      .setMessageCode("success")
      .setData(payload)
      .handle();
  }

  async sendOutdatedEmails(filter) {
    try {
      const emailConf = config.get("Emails");

      let repoList = await this.Repo.find(filter);
      if (!repoList) {
        return { data: null, error: "no_repo_found" };
      }

      // Update all repo data before sending emails
      const repoPromises = repoList.map(repo => {
        return upsertRepoFromGithub(repo.name, repo.namespace);
      });
      await Promise.all(repoPromises);

      repoList = await this.Repo.find(filter);
      if (!repoList) {
        return { data: null, error: "unexpected_error" };
      }

      // Create an object that holds packages in repos uniquely
      const packageListObj = repoList.reduce((listObj, repo) => {
        repo.packages.reduce((acc, pack) => {
          const key = generateUniquePackageKey(pack);
          if (Object.prototype.hasOwnProperty.call(acc, key)) {
            return acc;
          }

          acc[key] = { name: pack.name, registry: pack.registry };
          return acc;
        }, listObj);
        return listObj;
      }, {});
      const packageListArray = Object.values(packageListObj);

      // Insert or update info for all necessary packages before sending emails
      const packageList = await upsertPackageVersions(packageListArray);
      if (packageList.error) {
        return { data: null, error: packageList.error };
      }

      // Update package list object to hold the updated data
      for (let idx = 0; idx < packageList.data.length; idx += 1) {
        const pack = packageList.data[idx];
        const key = generateUniquePackageKey(pack);
        packageListObj[key] = pack.toObject();
      }

      // Update repo package data
      const repoPackagePromises = repoList.map(repo => {
        const { packages } = repo;
        const newPackages = [];

        for (let idx = 0; idx < packages.length; idx += 1) {
          const pack = packages[idx];
          const key = generateUniquePackageKey(pack);
          // Package list object is used like dictionary
          const registryVersion = packageListObj[key].version;

          const newPack = {
            ...pack.toObject(),
            registry_version: registryVersion
          };
          newPackages.push(newPack);
        }

        Object.assign(repo, { packages: newPackages });
        return repo.save();
      });
      await Promise.all(repoPackagePromises);

      repoList = await this.Repo.find(filter);
      if (!repoList) {
        return { data: null, error: "unexpected_error" };
      }

      // Send emails with necessary data
      const emailPromises = repoList.reduce((promises, repo) => {
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

      const emailResponses = await Promise.all(emailPromises);

      return { data: emailResponses, error: null };
    } catch (e) {
      return { data: null, error: e.message };
    }
  }
}

module.exports = RepoController;
