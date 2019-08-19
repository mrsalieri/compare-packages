const axios = require("axios");

module.exports = {
  httpReq: async obj => {
    const defaults = { timeout: 5000 };
    const params = { ...defaults, ...obj };
    return axios(params);
  }
};
