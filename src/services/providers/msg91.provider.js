const axios = require("axios");

class MSG91Provider {
  async sendOtp({ phone, otp, type }) {
    const authKey = process.env.MSG91_AUTH_KEY;
    const flowId = process.env.MSG91_FLOW_ID;
    const senderId = process.env.MSG91_SENDER_ID || "RABFIN";

    if (!authKey) {
      throw new Error("MSG91_AUTH_KEY is not configured in the environment variables.");
    }
    if (!flowId) {
      throw new Error("MSG91_FLOW_ID is not configured in the environment variables.");
    }

    // Clean phone number: remove '+' prefix if present
    const cleanedPhone = phone.startsWith("+") ? phone.substring(1) : phone;

    const payload = {
      template_id: flowId,
      sender: senderId,
      recipients: [
        {
          mobiles: cleanedPhone,
          otp: otp
        }
      ]
    };

    try {
      const response = await axios.post("https://control.msg91.com/api/v5/flow/", payload, {
        headers: {
          "authkey": authKey,
          "content-type": "application/json"
        }
      });

      if (response.data && response.data.type === "error") {
        throw new Error(`MSG91 Error: ${response.data.message}`);
      }

      return { success: true, data: response.data };
    } catch (error) {
      console.error("Failed to send SMS via MSG91:", error.response?.data || error.message);
      throw new Error(`MSG91 API failure: ${error.response?.data?.message || error.message}`);
    }
  }
}

module.exports = new MSG91Provider();
