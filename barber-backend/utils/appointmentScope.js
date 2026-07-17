// Decide which barber's appointments a request may see or modify.
//
// The scope is derived ONLY from the DB-loaded user (req.user, populated by
// requireUser) — never from a query param, body field, or JWT claim, so a client
// cannot widen its own scope.
//
//   role 'admin'    -> { barber: null }   no filter; sees/edits every barber
//   role 'calendar' -> { barber: <their barberName> }
//
// FAILS CLOSED: a 'calendar' user with no barberName linked gets 403. We never
// fall back to "see all" for a limited account.
function resolveBarberScope(user) {
  if (!user) {
    return { status: 401, message: "Unauthorized" };
  }
  if (user.role !== "calendar") {
    return { barber: null }; // full admin — unrestricted
  }
  if (!user.barberName) {
    return {
      status: 403,
      message: "No barber is linked to this account.",
    };
  }
  return { barber: user.barberName };
}

module.exports = { resolveBarberScope };
