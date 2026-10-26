// Owner-only features (Customer Counts page, cancellations bell). Checked against the
// DB username — never a JWT claim or anything the client sends.
const OWNER_USERNAMES = new Set(["lemo"]);

function isOwner(user) {
  return OWNER_USERNAMES.has(String(user?.username || "").trim().toLowerCase());
}

module.exports = { OWNER_USERNAMES, isOwner };
