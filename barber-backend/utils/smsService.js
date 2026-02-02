const axios = require("axios");

const sendSMS = async (to, message, options = {}) => {
  const smsToRawKey = process.env.SMS_TO_API_KEY;
  const webSmsRawKey = process.env.WEBSMS_API_KEY;

  if (!smsToRawKey) {
    throw new Error("❌ Missing SMS_TO_API_KEY in environment variables.");
  }

  const SMS_TO_API_KEY = smsToRawKey.trim();
  const WEBSMS_API_KEY = webSmsRawKey?.trim();
  const SMS_TO_URL = "https://api.sms.to/sms/send";
  const WEBSMS_URL = "https://websms.com.cy/api/send-sm";
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

  const toWebSmsNumber = (input) => {
    if (!input) throw new Error("Missing recipient phone number.");
    let digits = String(input).trim().replace(/\D/g, "");
    if (!digits) throw new Error("Recipient phone number contains no digits.");
    if (digits.startsWith("00")) {
      return digits;
    }
    return `00${digits}`;
  };

  const toWebSmsSender = (input) => {
    let sender = String(input || "").replace(/[^a-zA-Z0-9]/g, "");
    if (sender.length < 3 || /^\d+$/.test(sender)) {
      sender = "LemoApp";
    }
    if (sender.length > 11) {
      sender = sender.slice(0, 11);
    }
    return sender;
  };

  const sendViaSmsTo = async (formattedNumber) => {
    const response = await axios.post(
      SMS_TO_URL,
      {
        to: formattedNumber,
        message,
        sender_id: senderId,
      },
      {
        headers: {
          Authorization: `Bearer ${SMS_TO_API_KEY}`,
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
  };

  const sendViaWebSms = async (formattedNumber) => {
    if (!WEBSMS_API_KEY) {
      throw new Error("Missing WEBSMS_API_KEY in environment variables.");
    }

    const params = new URLSearchParams({
      to: toWebSmsNumber(formattedNumber),
      from: toWebSmsSender(senderId),
      key: WEBSMS_API_KEY,
      encoding: "GSM",
      message: String(message || ""),
    });

    const response = await axios.post(WEBSMS_URL, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    let data = response?.data;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (parseError) {
        // Keep raw string response when it's not JSON.
      }
    }

    const status = String(data?.status || "").toLowerCase();
    const batchId = data?.batchId || data?.batch_id;
    const success = status === "ok";

    if (!success) {
      const body = typeof data === "string" ? data : JSON.stringify(data);
      throw new Error(
        `WebSMS failed${body ? `: ${body}` : ""}`
      );
    }

    return {
      ...data,
      success,
      message_id: batchId,
      provider: "websms",
    };
  };

  let formattedNumber;
  try {
    formattedNumber = normalizeNumber(to);
    return await sendViaSmsTo(formattedNumber);
  } catch (error) {
    const detail = error.response?.data || error.message;
    const body =
      typeof detail === "string" ? detail : JSON.stringify(detail);
    console.error("SMS.to failed, trying WebSMS fallback", {
      status: error.response?.status,
      responseBody: body,
      recipient: formattedNumber,
      senderId,
      messagePreview: String(message || "").slice(0, 60),
      smsType,
    });

    try {
      return await sendViaWebSms(formattedNumber || normalizeNumber(to));
    } catch (fallbackError) {
      const fallbackDetail =
        fallbackError.response?.data || fallbackError.message;
      const fallbackBody =
        typeof fallbackDetail === "string"
          ? fallbackDetail
          : JSON.stringify(fallbackDetail);
      console.error("WebSMS fallback failed", {
        status: fallbackError.response?.status,
        responseBody: fallbackBody,
        recipient: formattedNumber || to,
        senderId,
        messagePreview: String(message || "").slice(0, 60),
        smsType,
      });
      throw new Error(
        `Failed to send SMS${fallbackDetail ? `: ${JSON.stringify(fallbackDetail)}` : ""}`
      );
    }
  }
};

module.exports = { sendSMS };
