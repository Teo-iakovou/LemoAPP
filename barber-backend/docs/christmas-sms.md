# Christmas SMS Broadcast

- **Message**: `Η ομάδα του Lemobarbershop σας εύχεται Καλά Χριστούγεννα! Σας ευχαριστούμε για την εμπιστοσύνη και ανυπομονούμε να σας περιποιηθούμε ξανά μέσα στη νέα χρονιά. 🎄`
- **Logic**: `controllers/christmasSms.js` loads every customer with a phone number, skips anyone that has already received the broadcast for the current year, and records the send date in `lastChristmasSMS`.
- **Automatic schedule**: in production the Node server uses `node-cron` to call `sendChristmasSMS()` every **25 December at 09:00 (Europe/Athens)**. See `server.js`.
- **Manual trigger**:
  - HTTP: `POST /api/customers/send-christmas-sms` (optional body `{ "force": true }` to bypass the 25/12 guard, but yearly duplicate protection still applies).
  - Node script: `node -e "require('./controllers/christmasSms').sendChristmasSMS({ force: true })"`.
- **Monitoring**: the controller logs aggregate stats (`sent`, `failed`, `alreadySent`) so `pm2 logs` / Render logs show the broadcast status.
