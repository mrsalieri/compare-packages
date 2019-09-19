const Joi = require("@hapi/joi");
const MessageHandler = require("../libs/messageHandler");

module.exports = {
  repoAddEmail: (req, res, next) => {
    const { nameIn, namespaceIn, emailListIn } = req.body;

    // To handle email list inputs sent as string(Swagger Problem)
    const arrayValidation = Joi.array().validate(emailListIn);
    const stringValidation = Joi.string().validate(emailListIn);
    let emailGroup = [];

    if (arrayValidation.error === null) {
      emailGroup = emailListIn;
    } else if (stringValidation.error === null) {
      emailGroup = emailListIn.split(",");
    }
    const obj = { nameIn, namespaceIn, emailGroup };

    const joiRepo = Joi.object().keys({
      nameIn: Joi.string().required(),
      namespaceIn: Joi.string().required(),
      emailGroup: Joi.array()
        .min(1)
        .required()
        .items(Joi.string().email())
    });
    const { error } = Joi.validate(obj, joiRepo);

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

    const obj = { nameIn, namespaceIn };

    const joiRepo = Joi.object().keys({
      nameIn: Joi.string().required(),
      namespaceIn: Joi.string().required()
    });

    const { error } = Joi.validate(obj, joiRepo);
    if (error) {
      return new MessageHandler(req, res)
        .badRequest()
        .setMessageCode("input_error")
        .setData(error.details[0].message)
        .handle();
    }

    // inputs are lowercased for db operations
    req.query.repoGetDetails = {
      name: obj.nameIn.toLowerCase(),
      namespace: obj.namespaceIn.toLowerCase()
    };

    return next();
  }
};
