const moment = require("moment");
const config = require("config");
const { httpReq } = require("../utils/httpReq");
const { Repo } = require("../models/repo");

const filesToDownload = config.get("FileNames.github");

module.exports = {
  requestRepoContentsFromGithub: async (name, namespace) => {
    try {
      const apiUrl = config.get("Apis.github.url");
      const response = await httpReq({
        method: "get",
        url: `${apiUrl}/repos/${namespace}/${name}/contents`
      });

      return response.data;
    } catch (e) {
      throw new Error("repo_not_found_on_github");
    }
  },

  prepareFileSummariesToDownload: repoContents => {
    if (!Array.isArray(repoContents) || repoContents.length === 0) {
      throw new Error("empty_repo_contents");
    }

    const fileContents = repoContents.filter(file => {
      const fileNames = Object.keys(filesToDownload);
      return fileNames.indexOf(file.name) > -1 && file.type === "file";
    });

    const fileSummaries = fileContents.map(val => {
      return { name: val.name, url: val.download_url };
    });

    return fileSummaries;
  },

  requestFilesFromGithubAndPrepareData: async fileSummaries => {
    const fileRequests = fileSummaries.map(file => {
      return httpReq({
        method: "get",
        url: file.url
      });
    });

    const fileResponses = await Promise.all(fileRequests);
    const files = fileResponses.map((response, idx) => {
      return { content: response.data, summary: fileSummaries[idx] };
    });

    return files;
  },

  // Returns package data in files
  getPackagesFromFiles: files => {
    const packages = files.reduce((initialPackages, file) => {
      const { summary, content } = file;
      const fileNamesToParse = Object.keys(filesToDownload);

      // Detects necessary files and merges results
      fileNamesToParse.map(targetFileName => {
        if (summary.name === targetFileName) {
          const targetFile = filesToDownload[targetFileName];
          const { registry } = targetFile;

          targetFile.dependencyKeys.map(dependencyKey => {
            if (Object.prototype.hasOwnProperty.call(content, dependencyKey)) {
              const dependencies = content[dependencyKey];

              const packageResponse = module.exports.parsePackages(
                registry,
                dependencies
              );

              packageResponse.reduce((acc, val) => {
                acc.push(val);
                return acc;
              }, initialPackages);
            }
            return null;
          });
        }
        return null;
      });

      return initialPackages;
    }, []);
    return packages;
  },

  // Creates or updates given repo data
  upsertRepoFromGithub: async (nameIn, namespaceIn) => {
    try {
      const name = nameIn.toLowerCase();
      const namespace = namespaceIn.toLowerCase();

      const repoContents = await module.exports.requestRepoContentsFromGithub(
        name,
        namespace
      );

      const fileSummaries = module.exports.prepareFileSummariesToDownload(
        repoContents
      );

      const files = await module.exports.requestFilesFromGithubAndPrepareData(
        fileSummaries
      );

      // Parse package data
      const packages = module.exports.getPackagesFromFiles(files);

      const repoParams = {
        packages,
        last_updated: moment.utc()
      };

      let repo = await Repo.findOne({ name, namespace });
      if (!repo) {
        repoParams.name = name;
        repoParams.namespace = namespace;
        repoParams.active = true;
        repoParams.emails = [];

        repo = new Repo();
      }

      Object.assign(repo, repoParams);
      const response = await repo.save();

      return { data: response, error: null };
    } catch (e) {
      return { data: null, error: e };
    }
  },

  parsePackages: (registry, dependencies) => {
    const parsedPackages = [];

    Object.entries(dependencies).reduce((initParsedPackages, dependency) => {
      const packageName = dependency[0];
      const packageVersion = dependency[1].trim();
      const packageData = {
        name: packageName,
        repo_version: packageVersion,
        registry_version: null,
        registry
      };

      // Filters composer.json dependencies out of composer
      if (
        registry === "npm" ||
        (registry === "composer" && packageName.indexOf("/") > -1)
      ) {
        initParsedPackages.push(packageData);
      }

      return initParsedPackages;
    }, parsedPackages);

    return parsedPackages;
  }
};
