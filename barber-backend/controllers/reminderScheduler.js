const Appointment = require("../models/appointment");
const ScheduledMessage = require("../models/ScheduledMessage");
const { sendSMS } = require("../utils/smsService");
const moment = require("moment-timezone");

const sendReminders = async (options = {}) => {
  const dryRun = Boolean(options?.dryRun);
  const limit = Number(options?.limit) || 0;
  try {
    const tz = "Europe/Athens";
    const nowAthens = moment().tz(tz);
    const timestamp = nowAthens.format("YYYY-MM-DD HH:mm:ss");
    const trigger = options?.trigger || "unknown";
    console.log(`[${timestamp}] 🔔 sendReminders trigger=${trigger}`);

    const windowStart = nowAthens.clone().add(24, "hours").subtract(10, "minutes");
    const windowEnd = nowAthens.clone().add(24, "hours").add(10, "minutes");

    const windowStartUTC = windowStart.clone().utc().toDate();
    const windowEndUTC = windowEnd.clone().utc().toDate();

    console.log(
      `[${timestamp}] 🕒 nowAthens=${nowAthens.toISOString()} nowUTC=${nowAthens.clone().utc().toISOString()}`
    );
    console.log(
      `[${timestamp}] 🪟 windowAthens=${windowStart.format("YYYY-MM-DD HH:mm:ss")}..${windowEnd.format("YYYY-MM-DD HH:mm:ss")} windowUTC=${windowStart.clone().utc().toISOString()}..${windowEnd.clone().utc().toISOString()}`
    );

    const query = {
      appointmentDateTime: {
        $gte: windowStartUTC,
        $lt: windowEndUTC,
      },
      appointmentStatus: "confirmed",
      type: "appointment",
      reminders: {
        $not: {
          $elemMatch: {
            type: "24-hour",
            status: { $ne: "failed" },
          },
        },
      },
    };

    console.log(
      `[${timestamp}] 🧩 Reminder query: ${JSON.stringify(query)}`
    );

    const appointments = await Appointment.find(query).lean();

    console.log(
      `[${timestamp}] 📦 Matched appointments: ${appointments.length}`
    );

    let selected = appointments;
    if (limit > 0) {
      selected = appointments.slice(0, limit);
    }

    if (selected.length === 0) {
      console.log(`[${timestamp}] 🔍 No appointments found in window.`);
      return;
    }

    console.log(
      `[${timestamp}] 📋 Found ${selected.length} appointments for reminders between ${windowStart.format("YYYY-MM-DD HH:mm")} and ${windowEnd.format("YYYY-MM-DD HH:mm")} Athens time`
    );

    for (const appointment of selected) {
      console.log(
        `[${timestamp}] ➡️ Reminder target _id=${appointment._id} name=${appointment.customerName} phone=${appointment.phoneNumber} apptUTC=${appointment.appointmentDateTime}`
      );
      if (dryRun) {
        console.log(
          `[${timestamp}] 🧪 Dry run: would send reminder for ${appointment.customerName} (${appointment.phoneNumber})`
        );
        continue;
      }
      const appointmentTimeAthens = moment(appointment.appointmentDateTime)
        .tz(tz)
        .format("DD/MM/YYYY HH:mm");

      const message = `Υπενθύμιση για το ραντεβού σας αύριο στις ${appointmentTimeAthens} στο Lemo Barber Shop. Reminder for your appointment tomorrow at ${appointmentTimeAthens} at Lemo Barber Shop.`;

      const claimed = await Appointment.findOneAndUpdate(
        {
          _id: appointment._id,
          reminders: {
            $not: {
              $elemMatch: {
                type: "24-hour",
                status: { $ne: "failed" },
              },
            },
          },
        },
        {
          $push: {
            reminders: {
              type: "24-hour",
              sentAt: new Date(),
              messageId: null,
              status: "pending",
              messageText: message,
              senderId: "Lemo Barber",
              retryCount: 0,
            },
          },
        },
        { new: true }
      );

      if (!claimed) {
        console.log(
          `[${timestamp}] ⚠️ Skipping ${appointment.customerName} (${appointmentTimeAthens}) - already claimed by another process.`
        );
        continue;
      }

      const reminderEntry =
        claimed.reminders[claimed.reminders.length - 1];
      const reminderId = reminderEntry?._id;

      try {
        const result = await sendSMS(appointment.phoneNumber, message, {
          smsType: "24-hour",
        });

        const successStatus = result?.success ? "sent" : result?.status || "sent";
        await Appointment.updateOne(
          { _id: appointment._id, "reminders._id": reminderId },
          {
            $set: {
              "reminders.$.status": successStatus,
              "reminders.$.messageId":
                result?.message_id || result?.messageId || null,
              "reminders.$.sentAt": new Date(),
              "reminders.$.messageText": message,
            },
          }
        );

        console.log(`[${timestamp}] ✅ Reminder sent to ${appointment.customerName} (${appointmentTimeAthens})`);
      } catch (err) {
        console.error(
          `[${timestamp}] ❌ SMS failed for ${appointment.customerName}: ${err.message}`
        );
        await Appointment.updateOne(
          { _id: appointment._id, "reminders._id": reminderId },
          {
            $set: {
              "reminders.$.status": "failed",
              "reminders.$.sentAt": new Date(),
              "reminders.$.error": err?.message || "Failed to send SMS",
            },
            $inc: { "reminders.$.retryCount": 1 },
          }
        );
      }
    }
  } catch (err) {
    const errorTime = moment().tz("Europe/Athens").format("YYYY-MM-DD HH:mm:ss");
    console.error(`[${errorTime}] ❌ Reminder script failed: ${err.message}`);
  }
};

module.exports = { sendReminders };

const FOLLOWUP_TZ = "Europe/Athens";
// Legacy fallback: messages created before the additionalFromIndex field existed were all
// built with a hardcoded split at 5 (labels.slice(5)). This 5 is a historical constant for
// those old documents only — NOT the live threshold (which lives in appointmentController as
// RECURRENCE_SPLIT_INDEX and is now persisted per-message). Do not couple the two.
const LEGACY_ADDITIONAL_FROM_INDEX = 5;

const getBarberDisplayName = (barber = "") =>
  barber === "ΚΟΥΣΙΗΣ" ? "ΚΟΥΣΙΗ" : barber;

// Extract the unique DD/MM/YYYY HH:mm dates printed in a stored message, in order. Used only
// for logging "what was originally promised" vs "what we actually sent".
const parseFollowupDates = (text = "") => {
  const out = [];
  const seen = new Set();
  const re = /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/g;
  let m;
  while ((m = re.exec(text))) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      out.push(m[1]);
    }
  }
  return out;
};

// Build the confirmation text from LIVE dates, with singular/plural agreement in both
// languages. Greek "ραντεβού" is invariant, so only the article changes (το/τα); English
// switches appointment(s).
const buildFollowupMessage = (dates, barber) => {
  const displayBarber = getBarberDisplayName(barber || "");
  const joined = dates.join(", ");
  const single = dates.length === 1;
  const gr = single ? "το επιπλέον ραντεβού σας" : "τα επιπλέον ραντεβού σας";
  const en = single ? "additional appointment" : "additional appointments";
  return (
    `Επιβεβαιώνουμε ${gr} στο LEMO BARBER SHOP με τον ${displayBarber}: ${joined}.\n` +
    `We confirm your ${en} at LEMO BARBER SHOP with ${displayBarber}: ${joined}.`
  );
};

// Revalidate a scheduled follow-up against the live calendar at SEND time. Reads only; makes
// no writes and sends no SMS. Returns what should be sent (or a skip decision). Exported so
// the send loop and tests share one implementation.
//   { skip:true, reason, original[], sent:[], dropped[] }                  -> do not send
//   { skip:false, message, sent[], original[], dropped[], firstApptId }    -> send `message`
async function resolveFollowup(msg) {
  const original = parseFollowupDates(msg.messageText || "");
  const fromIndex = Number.isInteger(msg.additionalFromIndex)
    ? msg.additionalFromIndex
    : LEGACY_ADDITIONAL_FROM_INDEX;

  // Only the "additional" (second-half) appointments this message is about — never re-list
  // the first-half dates the customer was already confirmed for at booking time.
  const relevantIds = (msg.appointmentIds || []).slice(fromIndex);
  if (!relevantIds.length) {
    return { skip: true, reason: "no-appointment-refs", original, sent: [], dropped: original };
  }

  // Survivors = still exist AND still confirmed. Rescheduled ones surface at their CURRENT
  // datetime; deleted/cancelled ones simply drop out.
  const survivors = await Appointment.find({
    _id: { $in: relevantIds },
    appointmentStatus: "confirmed",
    type: "appointment",
  })
    .select({ appointmentDateTime: 1 })
    .lean();

  survivors.sort(
    (a, b) => new Date(a.appointmentDateTime) - new Date(b.appointmentDateTime)
  );
  const sent = survivors.map((a) =>
    moment(a.appointmentDateTime).tz(FOLLOWUP_TZ).format("DD/MM/YYYY HH:mm")
  );
  const dropped = original.filter((d) => !sent.includes(d));

  if (!sent.length) {
    return { skip: true, reason: "all-cancelled", original, sent, dropped };
  }

  return {
    skip: false,
    message: buildFollowupMessage(sent, msg.barber),
    sent,
    original,
    dropped,
    firstApptId: survivors[0]._id,
  };
}

// Process scheduled messages due to be sent (e.g., recurrence follow-ups).
// Rebuilds each message from the live calendar at send time so a reschedule/cancellation that
// happened after booking can never send a customer a wrong or phantom date.
async function processScheduledMessages() {
  const now = moment().tz(FOLLOWUP_TZ).toDate();
  const due = await ScheduledMessage.find({ status: "pending", sendAt: { $lte: now } })
    .limit(50)
    .lean();
  if (!due.length) return;

  for (const msg of due) {
    let resolved;
    try {
      resolved = await resolveFollowup(msg);
    } catch (e) {
      await ScheduledMessage.updateOne(
        { _id: msg._id },
        { $set: { status: "failed" }, $inc: { retryCount: 1 } }
      );
      console.error(
        `[recurrence-followup][FAILED] msg=${msg._id} phone=${msg.phoneNumber} resolve error: ${e.message}`
      );
      continue;
    }

    if (resolved.skip) {
      await ScheduledMessage.updateOne({ _id: msg._id }, { $set: { status: "skipped" } });
      console.warn(
        `[recurrence-followup][SKIPPED] msg=${msg._id} phone=${msg.phoneNumber} reason=${resolved.reason} ` +
          `original=[${resolved.original.join(" | ")}] sent=[] dropped=[${resolved.dropped.join(" | ")}] — nothing sent`
      );
      continue;
    }

    try {
      const result = await sendSMS(msg.phoneNumber, resolved.message, {
        smsType: "recurrence-followup",
      });
      await ScheduledMessage.updateOne({ _id: msg._id }, { $set: { status: "sent" } });

      // Forensic log: exactly what was promised vs what actually went out, so "what did we
      // send this customer" is answerable from logs without re-running a script.
      if (resolved.dropped.length) {
        console.warn(
          `[recurrence-followup][MODIFIED] msg=${msg._id} phone=${msg.phoneNumber} ` +
            `original=[${resolved.original.join(" | ")}] sent=[${resolved.sent.join(" | ")}] ` +
            `dropped=[${resolved.dropped.join(" | ")}]`
        );
      } else {
        console.log(
          `[recurrence-followup][SENT] msg=${msg._id} phone=${msg.phoneNumber} sent=[${resolved.sent.join(" | ")}]`
        );
      }

      // Best-effort: attach a reminder log to the first SURVIVING appointment, storing the
      // text we actually sent (not the frozen original).
      if (resolved.firstApptId) {
        await Appointment.updateOne(
          { _id: resolved.firstApptId },
          {
            $push: {
              reminders: {
                type: "recurrence-followup",
                sentAt: new Date(),
                status: result?.success ? "sent" : result?.status || "sent",
                messageText: resolved.message,
                senderId: "Lemo Barber",
                retryCount: 0,
              },
            },
          }
        );
      }
    } catch (e) {
      await ScheduledMessage.updateOne(
        { _id: msg._id },
        { $set: { status: "failed" }, $inc: { retryCount: 1 } }
      );
      console.error(
        `[recurrence-followup][FAILED] msg=${msg._id} phone=${msg.phoneNumber}: ${e.message}`
      );
    }
  }
}

module.exports.processScheduledMessages = processScheduledMessages;
module.exports.resolveFollowup = resolveFollowup;
module.exports.buildFollowupMessage = buildFollowupMessage;
module.exports.parseFollowupDates = parseFollowupDates;
