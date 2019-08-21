const moment = require("moment");
const config = require("config");
const { httpReq } = require("../utils/httpReq");
const { Repo } = require("../models/repo");

const fileInfo = config.get("FileNames.github");

module.exports = {
  getRepoContentsFromGithub: async (name, namespace) => {
    try {
      const apiUrl = config.get("Apis.github.url");
      const response = await httpReq({
        method: "get",
        url: `${apiUrl}/repos/${namespace}/${name}/contents`
      });

      return { data: response.data, error: null };
    } catch (e) {
      return { data: null, error: e.message };
    }
  },

  // Finds and downloads necessary files in github response data
  getFilesFromGithub: async data => {
    try {
      let files = [];

      if (Array.isArray(data) && data.length > 0) {
        files = data.filter(file => {
          const fileNames = Object.keys(fileInfo);
          return fileNames.indexOf(file.name) > -1 && file.type === "file";
        });
      }

      const fileData = files.map(val => {
        return { name: val.name, url: val.download_url };
      });
      const promises = fileData.map(file => {
        return httpReq({
          method: "get",
          url: file.url
        });
      });

      const responses = await Promise.all(promises);
      const dataResponse = responses.map((response, idx) => {
        return { content: response.data, fileData: fileData[idx] };
      });

      return { data: dataResponse, error: null };
    } catch (e) {
      return { data: null, error: e.message };
    }
  },

  // Returns package data in files
  getPackagesFromFiles: files => {
    try {
      const data = files.reduce((acc, file) => {
        const { fileData, content } = file;
        // Detects necessary files and merges results
        Object.keys(fileInfo).map(fileName => {
          if (fileData.name === fileName) {
            fileInfo[fileName].deps.map(key => {
              if (Object.prototype.hasOwnProperty.call(content, key)) {
                const deps = content[key];
                const { registry } = fileInfo[fileName];

                const result = module.exports.parsePackages(registry, deps);

                if (result.data) {
                  result.data.reduce((accRef, val) => {
                    accRef.push(val);
                    return accRef;
                  }, acc);
                }
              }
              return null;
            });
          }
          return null;
        });

        return acc;
      }, []);
      return { data, error: null };
    } catch (e) {
      return { data: null, error: e.message };
    }
  },

  // Creates or updates given repo data
  upsertRepoFromGithub: async (nameIn, namespaceIn) => {
    try {
      const name = nameIn.toLowerCase();
      const namespace = namespaceIn.toLowerCase();

      const contents = await module.exports.getRepoContentsFromGithub(
        name,
        namespace
      );
      if (contents.error) {
        return { data: null, error: "repo_not_found_on_git" };
      }

      const files = await module.exports.getFilesFromGithub(contents.data);
      if (files.error) {
        return { data: null, error: "files_not_found_on_git" };
      }

      // Parse package data
      const packages = module.exports.getPackagesFromFiles(files.data);
      if (packages.error) {
        return { data: null, error: "parse_error" };
      }

      const params = {
        packages: packages.data,
        last_updated: moment.utc()
      };

      let repo = await Repo.findOne({ name, namespace });
      if (!repo) {
        params.name = name;
        params.namespace = namespace;
        params.active = true;
        params.emails = [];

        repo = new Repo();
      }

      Object.assign(repo, params);
      const response = await repo.save();

      return { data: response, error: null };
    } catch (e) {
      return { data: null, error: "unexpected_error" };
    }
  },

  parsePackages: (registry, dependecies) => {
    try {
      const resultArray = [];

      Object.entries(dependecies).reduce((ary, dep) => {
        const packageName = dep[0];
        const packageVers = dep[1].trim();
        const packageData = {
          name: packageName,
          repo_version: packageVers,
          registry_version: null,
          registry
        };

        // Filters composer.json dependencies out of composer
        if (
          registry === "npm" ||
          (registry === "composer" && packageName.indexOf("/") > -1)
        ) {
          ary.push(packageData);
        }

        return ary;
      }, resultArray);

      return { data: resultArray, error: null };
    } catch (e) {
      return { data: null, error: e.mesasge };
    }
  }
};
