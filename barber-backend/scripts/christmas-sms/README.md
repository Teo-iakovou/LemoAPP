## Christmas SMS Manual Trigger

1. Ensure the backend environment variables are available in your shell (`MONGODB_URI`, `SMS_TO_API_KEY`, etc.).
2. From `LemoAPP/barber-backend/`, run:

```bash
NODE_ENV=production node scripts/christmas-sms/sendChristmasSms.js
```

The script connects to MongoDB, fetches all customers with a phone number, and sends the festive message that was approved. Progress and failures are logged to the console; at the end you’ll see summary stats plus any error details.

> ✅ Duplicate guard: once a customer receives the message, their `lastChristmasSMS` timestamp is updated. Re-running the script in the same year skips those customers automatically, so only the missed recipients are retried.
