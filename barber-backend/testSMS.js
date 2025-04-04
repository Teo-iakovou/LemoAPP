require("dotenv").config();
const { sendSMS } = require("./utils/smsService");

(async () => {
  try {
    const phoneNumber = "+35797869631"; // Replace with your phone number
    const message = `Hi Theodoros! Your LEMO appointment is confirmed for 08/04 at 10:00. Thank you!`;
    const result = await sendSMS(phoneNumber, message);
    console.log("SMS sent successfully:", result);
  } catch (error) {
    console.error("Error sending SMS:", error.message);
  }
})();
