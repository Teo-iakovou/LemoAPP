const axios = require("axios");

const sendSMS = async (to, message, options = {}) => {
  const rawKey = process.env.SMS_TO_API_KEY;

  if (!rawKey) {
    throw new Error("❌ Missing SMS_TO_API_KEY in environment variables.");
  }

  const API_KEY = rawKey.trim();
  const SMS_URL = "https://api.sms.to/sms/send";
  const smsType = options.smsType || "unknown";
  const senderId = options.senderId || "Lemo Barber";

  const normalizeNumber = (input) => {
    if (!input) throw new Error("Missing recipient phone number.");

    const raw = String(input).trim();
    if (!raw) throw new Error("Missing recipient phone number.");

    if (raw.startsWith("+")) {
      return raw;
    }

    // Remove common separators and keep digits only for pattern checks
    let digits = raw.replace(/\D/g, "");

    if (!digits) {
      throw new Error("Recipient phone number contains no digits.");
    }

    // Allow prefixes using 00 international format (e.g., 00351...)
    if (digits.startsWith("00")) {
      digits = digits.slice(2);
    }

    // Handle numbers already containing country code without '+'
    if (digits.startsWith("351") && digits.length === 12) {
      return `+${digits}`;
    }
    if (digits.startsWith("44") && digits.length === 12) {
      return `+${digits}`;
    }

    // Portuguese domestic numbers are 9 digits
    if (digits.length === 9) {
      return `+351${digits}`;
    }

    // UK domestic numbers usually start with 0 and have 11 digits
    if (digits.length === 11 && digits.startsWith("0")) {
      return `+44${digits.slice(1)}`;
    }

    // Existing behaviour: default Greek 10-digit numbers
    if (digits.length === 10) {
      return `+30${digits}`;
    }

    // Fallback to Cyprus code for other cases (legacy behaviour)
    return `+357${digits}`;
  };

  let formattedNumber;
  try {
    formattedNumber = normalizeNumber(to);
    const response = await axios.post(
      SMS_URL,
      {
        to: formattedNumber,
        message,
        sender_id: senderId,
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    const messageId = response?.data?.message_id || response?.data?.messageId;
    if (!messageId) {
      const body =
        typeof response?.data === "string"
          ? response.data
          : JSON.stringify(response?.data);
      console.error("SMS.to missing messageId", {
        status: response?.status,
        responseBody: body,
        recipient: formattedNumber,
        senderId,
        messagePreview: String(message || "").slice(0, 60),
        smsType,
      });
    }
    return response.data;
  } catch (error) {
    const detail = error.response?.data || error.message;
    const body =
      typeof detail === "string" ? detail : JSON.stringify(detail);
    console.error("Failed to send SMS", {
      status: error.response?.status,
      responseBody: body,
      recipient: formattedNumber,
      senderId,
      messagePreview: String(message || "").slice(0, 60),
      smsType,
    });
    throw new Error(
      `Failed to send SMS${detail ? `: ${JSON.stringify(detail)}` : ""}`
    );
  }
};

module.exports = { sendSMS };
