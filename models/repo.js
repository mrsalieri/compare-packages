const Joi = require("@hapi/joi");
const { mongoose } = require("../utils/db");

const { Schema } = mongoose;

const packageSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  repo_version: {
    type: String,
    required: true
  },
  registry_version: {
    type: String
  },
  registry: {
    type: String,
    required: true
  }
});

const repoSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  namespace: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    required: true,
    default: true
  },
  packages: [packageSchema],
  emails: [String],
  last_updated: {
    type: Date
  }
});

const Repo = mongoose.model("Repo", repoSchema);

// For input validation
const joiPackageSchema = Joi.object().keys({
  name: Joi.string().required(),
  repo_version: Joi.string().required(),
  registry_version: Joi.string().required(),
  registry: Joi.string()
    .valid("npm", "composer")
    .required()
});

const joiEmailSchema = Joi.string().email();

// Input validation for creating package
function validatePackage(data) {
  return Joi.validate(data, joiPackageSchema);
}

// Input validation for emails
function validateEmail(data) {
  return Joi.validate(data, joiEmailSchema);
}

// Input validation for creating repo
function validateRepo(data) {
  const schema = Joi.object().keys({
    name: Joi.string().required(),
    namespace: Joi.string().required(),
    active: Joi.boolean().required(),
    packages: Joi.array().items(joiPackageSchema),
    emails: Joi.array().items(joiEmailSchema),
    last_updated: Joi.date().timestamp()
  });

  return Joi.validate(data, schema);
}

function isPackageOutdated(pack) {
  try {
    if (
      Object.prototype.hasOwnProperty.call(pack, "repo_version") &&
      Object.prototype.hasOwnProperty.call(pack, "registry_version")
    ) {
      let repoVersion = pack.repo_version;
      const registryVersion = pack.registry_version;
      /*
        OUTDATED CHECK LOGIC SHOULD BE IMPROVED
      */
      const firstChar = repoVersion.charAt(0);
      const numericCheck = Joi.string().regex(/^[0-9]+$/, "numbers");
      const validation = numericCheck.validate(firstChar);
      if (validation.error) {
        repoVersion = repoVersion.substring(1);
      }

      return repoVersion !== registryVersion;
    }
    return true;
  } catch (e) {
    return true;
  }
}

function prepareOutdatedEmailHtml(repo) {
  try {
    const { packages } = repo;
    const outdatedPackages = packages.filter(pack => {
      return isPackageOutdated(pack);
    });
    const emailHtmlInit = `<table>
      <tr>
        <th>package</th>
        <th>registry</th>
        <th>repo version</th>
        <th>regstry version</th>
      </tr>`;
    const emailHtml = outdatedPackages.reduce((acc, val) => {
      return `${acc}<tr>
                      <td>${val.name}</td>
                      <td>${val.registry}</td>
                      <td>${val.repo_version || "0"}</td>
                      <td>${val.registry_version || "0"}</td>
                    </tr>`;
    }, emailHtmlInit);

    return `${emailHtml}</table>`;
  } catch (e) {
    return null;
  }
}

module.exports = {
  Repo,
  validatePackage,
  validateEmail,
  validateRepo,
  isPackageOutdated,
  prepareOutdatedEmailHtml
};
