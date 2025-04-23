const axios = require("axios");

const API_KEY =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2F1dGg6ODA4MC9hcGkvdjEvdXNlcnMvYXBpL2tleXMvZ2VuZXJhdGUiLCJpYXQiOjE3MzQ4NTk1ODUsIm5iZiI6MTczNDg1OTU4NSwianRpIjoiMTlXVERvQ2pvSGRnRmFYUyIsInN1YiI6NDcwNDc2LCJwcnYiOiIyM2JkNWM4OTQ5ZjYwMGFkYjM5ZTcwMWM0MDA4NzJkYjdhNTk3NmY3In0.mJMJF68czD32z22jjfIT66UySAB48UKhOsk7dVIPWHk";
const MESSAGE_ID = "470476-1744726-d825-11f7-7e3005f1-80"; // Replace this with an actual message_id you want to test

const checkSMSStatus = async () => {
  try {
    const response = await axios.get(`https://api.sms.to/sms/${MESSAGE_ID}`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        Accept: "application/json",
      },
    });

    console.log("✅ SMS.to Status Response:");
    console.log(response.data);
  } catch (error) {
    if (error.response) {
      console.error(
        "❌ Error Response:",
        error.response.status,
        error.response.data
      );
    } else {
      console.error("❌ Error:", error.message);
    }
  }
};

checkSMSStatus();
