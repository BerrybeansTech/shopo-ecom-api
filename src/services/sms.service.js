const mockProvider = require("./providers/mock.provider");
const msg91Provider = require("./providers/msg91.provider");

class SMSService {
  getProvider() {
    const providerName = (process.env.SMS_PROVIDER || "mock").toLowerCase().trim();
    switch (providerName) {
      case "msg91":
        return msg91Provider;
      case "mock":
      default:
        return mockProvider;
    }
  }

  async sendOtp({ phone, otp, type }) {
    const provider = this.getProvider();
    return provider.sendOtp({ phone, otp, type });
  }
}

module.exports = new SMSService();
