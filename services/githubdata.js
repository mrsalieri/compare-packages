const moment = require("moment");
const config = require("config");
const { httpReq } = require("../utils/httpReq");
const { objectHelper, arrayHelper } = require("../utils/commonHelpers");
const { Repo } = require("../models/repo");

const filesToDownload = config.get("FileNames.github");

const { hasOwnPropertyCall } = objectHelper;
const { appendArrayOnTargetArray, isArrayWithElements } = arrayHelper;

async function requestRepoContentsFromGithub(name, namespace) {
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
}

function extractFileContentsFromRepoContents(repoContents) {
  const fileNames = Object.keys(filesToDownload);

  const fileContents = repoContents.filter(file => {
    return fileNames.indexOf(file.name) > -1 && file.type === "file";
  });

  return fileContents;
}

function prepareFileSummariesToDownload(repoContents) {
  if (!isArrayWithElements(repoContents)) {
    throw new Error("empty_repo_contents");
  }

  const fileContents = extractFileContentsFromRepoContents(repoContents);

  const fileSummaries = fileContents.map(val => {
    return { name: val.name, url: val.download_url };
  });

  return fileSummaries;
}

async function requestFilesFromGithubAndPrepareData(fileSummaries) {
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
}

function generatePackageData({ registry, dependency }) {
  const packageName = dependency[0];
  const packageVersion = dependency[1].trim();

  return {
    name: packageName,
    repo_version: packageVersion,
    registry_version: null,
    registry
  };
}

function parsePackages({ registry, dependencies }) {
  const dependencyData = Object.entries(dependencies);

  const parsedPackages = dependencyData.reduce((accumulator, dependency) => {
    const packageData = generatePackageData({
      registry,
      dependency
    });
    const { name } = packageData;

    // Removes composer.json dependencies out of composer
    if (
      registry === "npm" ||
      (registry === "composer" && name.indexOf("/") > -1)
    ) {
      accumulator.push(packageData);
    }

    return accumulator;
  }, []);

  return parsedPackages;
}

function extractPackagesFromFileContent({ fileContent, fileInfo }) {
  const { registry, dependencyKeys } = fileInfo;

  const packagesToBeAdded = dependencyKeys.reduce(
    (accumulator, dependencyKey) => {
      if (hasOwnPropertyCall(fileContent, dependencyKey)) {
        const dependencies = fileContent[dependencyKey];
        const packageResponse = parsePackages({ registry, dependencies });

        appendArrayOnTargetArray({
          targetArray: accumulator,
          arrayToBeAppended: packageResponse
        });
      }

      return accumulator;
    },
    []
  );

  return packagesToBeAdded;
}

function getPackagesFromFiles(files) {
  const fileNamesToParse = Object.keys(filesToDownload);

  const packages = files.reduce((accumulator, file) => {
    const { summary, content } = file;
    const fileName = summary.name;

    if (fileNamesToParse.indexOf(fileName) > -1) {
      const targetFile = filesToDownload[fileName];

      const packagesToBeAdded = extractPackagesFromFileContent({
        fileContent: content,
        fileInfo: targetFile
      });

      appendArrayOnTargetArray({
        targetArray: accumulator,
        arrayToBeAppended: packagesToBeAdded
      });
    }

    return accumulator;
  }, []);

  return packages;
}

async function upsertRepoWithPackages(repoData) {
  const { name, namespace, packages } = repoData;
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

  return response;
}

// Creates or updates given repo data
async function upsertRepoFromGithub(nameIn, namespaceIn) {
  try {
    const name = nameIn.toLowerCase();
    const namespace = namespaceIn.toLowerCase();

    const repoContents = await requestRepoContentsFromGithub(name, namespace);

    const fileSummaries = prepareFileSummariesToDownload(repoContents);

    const files = await requestFilesFromGithubAndPrepareData(fileSummaries);

    const packages = getPackagesFromFiles(files);

    const response = await upsertRepoWithPackages({
      name,
      namespace,
      packages
    });

    return { data: response, error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

module.exports = {
  requestRepoContentsFromGithub,
  prepareFileSummariesToDownload,
  requestFilesFromGithubAndPrepareData,
  extractPackagesFromFileContent,
  getPackagesFromFiles,
  upsertRepoWithPackages,
  upsertRepoFromGithub,
  generatePackageData,
  parsePackages
};
