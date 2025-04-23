const axios = require("axios");

const sendSMS = async (to, message) => {
  const API_KEY = process.env.SMS_TO_API_KEY.trim(); // Load the API key
  const SMS_URL = "https://api.sms.to/sms/send";

  // Determine the country code prefix
  const formattedNumber = to.startsWith("+")
    ? to.trim()
    : to.length === 10
    ? `+30${to.trim()}` // Greek numbers typically have 10 digits
    : `+357${to.trim()}`; // Default to Cyprus

  try {
    const response = await axios.post(
      SMS_URL,
      {
        to: formattedNumber, // Use the formatted number
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
