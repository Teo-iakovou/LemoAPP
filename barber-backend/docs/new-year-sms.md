# New Year SMS Broadcast

- **Message**: `Η ομάδα του Lemobarbershop σας εύχεται Καλή Χρονιά! Ευχαριστούμε για την εμπιστοσύνη και σας περιμένουμε για νέες περιποιήσεις μέσα στο 2025. 🎉`
- **Controller**: `controllers/newYearSms.js`
  - Skips duplicates using `lastNewYearSMS`.
  - Logs stats (`sent`, `failed`, `alreadySent`) for quick verification.
- **Automatic schedule**: in production, `server.js` registers a cron job to fire on **1 January at 09:00 (Europe/Athens)**.
- **Manual trigger**: `POST /api/customers/send-newyear-sms` with optional `{ "force": true }` to bypass the calendar guard (useful for staging tests). Yearly duplicate protection still applies.
