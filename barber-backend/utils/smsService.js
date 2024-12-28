const axios = require("axios");

const sendSMS = async (to, message) => {
  const API_KEY = process.env.SMS_TO_API_KEY.trim(); // Load the API key
  const SMS_URL = "https://api.sms.to/sms/send";

  try {
    const response = await axios.post(
      SMS_URL,
      {
        to,
        message,
        sender_id: "LemoBarber",
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("SMS sent successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to send SMS:", error.response?.data || error.message);
    throw new Error("Failed to send SMS");
  }
};

module.exports = { sendSMS };
