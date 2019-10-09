const Joi = require("@hapi/joi");
const MessageHandler = require("../libs/messageHandler");

function processArrayInput(ary) {
  // To handle email list inputs sent as string(Swagger Problem)
  const arrayValidation = Joi.array().validate(ary);
  const stringValidation = Joi.string().validate(ary);
  let processedArray = [];

  if (arrayValidation.error === null) {
    processedArray = ary;
  } else if (stringValidation.error === null) {
    processedArray = ary.split(",");
  }

  return processedArray;
}

module.exports = {
  repoAddEmail: (req, res, next) => {
    const { nameIn, namespaceIn, emailListIn } = req.body;

    const emailGroup = processArrayInput(emailListIn);
    const repo = { nameIn, namespaceIn, emailGroup };

    const joiRepo = Joi.object().keys({
      nameIn: Joi.string().required(),
      namespaceIn: Joi.string().required(),
      emailGroup: Joi.array()
        .min(1)
        .required()
        .items(Joi.string().email())
    });
    const { error } = Joi.validate(repo, joiRepo);

    if (error) {
      return new MessageHandler(req, res)
        .badRequest()
        .setMessageCode("input_error")
        .setData(error.details[0].message)
        .handle();
    }

    // inputs are lowercased for db operations
    req.body.repoAddEmail = {
      name: nameIn.toLowerCase(),
      namespace: namespaceIn.toLowerCase(),
      emailGroup: emailGroup.map(email => email.toLowerCase())
    };

    return next();
  },

  repoGetDetails: (req, res, next) => {
    const { nameIn, namespaceIn } = req.query;
    const repo = { nameIn, namespaceIn };

    const joiRepo = Joi.object().keys({
      nameIn: Joi.string().required(),
      namespaceIn: Joi.string().required()
    });

    const { error } = Joi.validate(repo, joiRepo);
    if (error) {
      return new MessageHandler(req, res)
        .badRequest()
        .setMessageCode("input_error")
        .setData(error.details[0].message)
        .handle();
    }

    // inputs are lowercased for db operations
    req.query.repoGetDetails = {
      name: nameIn.toLowerCase(),
      namespace: namespaceIn.toLowerCase()
    };

    return next();
  }
};
