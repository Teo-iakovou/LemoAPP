const axios = require("axios");

const sendSMS = async (to, message) => {
  const rawKey = process.env.SMS_TO_API_KEY;

  if (!rawKey) {
    throw new Error("❌ Missing SMS_TO_API_KEY in environment variables.");
  }

  const API_KEY = rawKey.trim();
  const SMS_URL = "https://api.sms.to/sms/send";

  const formattedNumber = to.startsWith("+")
    ? to.trim()
    : to.length === 10
    ? `+30${to.trim()}`
    : `+357${to.trim()}`;

  try {
    const response = await axios.post(
      SMS_URL,
      {
        to: formattedNumber,
        message,
        sender_id: "Lemo Barber",
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(
      "🚀 Raw SMS.to response:",
      JSON.stringify(response.data, null, 2)
    );
    return response.data;
  } catch (error) {
    console.error("Failed to send SMS:", error.response?.data || error.message);
    throw new Error("Failed to send SMS");
  }
};

module.exports = { sendSMS };
