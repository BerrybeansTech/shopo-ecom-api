class MockProvider {
  async sendOtp({ phone, otp, type }) {
    console.log(`[Mock SMS] Sending OTP "${otp}" to ${phone} for type "${type}"`);
    return { success: true };
  }
}

module.exports = new MockProvider();
