class ResponseData {
  constructor(obj) {
    this.defaultData = {
      status: 200,
      code: "success",
      data: null
    };

    this.data = Object.assign(this.defaultData, obj);
  }

  setStatus(status) {
    this.data.status = status;
    return this;
  }

  setCode(code) {
    this.data.code = code;
    return this;
  }

  setData(data) {
    this.data.data = data;
    return this;
  }

  getResponseData() {
    return this.data;
  }
}

module.exports = ResponseData;
