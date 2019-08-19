const Joi = require("@hapi/joi");
const { mongoose } = require("../utils/db");

const { Schema } = mongoose;

const packageSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  version: {
    type: String,
    required: true
  },
  registry: {
    type: String,
    required: true
  },
  last_updated: {
    type: Date
  }
});

const Package = mongoose.model("Package", packageSchema);

// Input validation for creating package
function validatePackage(data) {
  const schema = Joi.object().keys({
    name: Joi.string().required(),
    version: Joi.string().required(),
    registry: Joi.string()
      .valid("npm", "composer")
      .required(),
    last_updated: Joi.date().timestamp()
  });

  return Joi.validate(data, schema);
}

function generateUniquePackageKey(pack) {
  return `${pack.name}__${pack.registry}`;
}

module.exports = { Package, validatePackage, generateUniquePackageKey };
