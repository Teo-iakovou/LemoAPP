require("dotenv").config();
const { sendSMS } = require("./utils/smsService");

(async () => {
  try {
    const phoneNumber = "+35797869631"; // Replace with your phone number
    const message = "Hello! This is a test message from your app via SMS.to.";
    const result = await sendSMS(phoneNumber, message);
    console.log("SMS sent successfully:", result);
  } catch (error) {
    console.error("Error sending SMS:", error.message);
  }
})();
