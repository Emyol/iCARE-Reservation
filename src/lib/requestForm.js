/**
 * Link to the public Google Form people use to request a room.
 *
 * NEXT_PUBLIC_REQUEST_FORM_URL is the form's share link (Form → Send → link).
 * NEXT_PUBLIC_REQUEST_FORM_PREFILL_URL is optional: a "Get pre-filled link"
 * URL with the answers replaced by {room}, {date}, {start} and {end}.
 *
 * Never point either at the response spreadsheet: it holds every requester's
 * name and email.
 */
const FORM_URL = process.env.NEXT_PUBLIC_REQUEST_FORM_URL || "";
const PREFILL_URL = process.env.NEXT_PUBLIC_REQUEST_FORM_PREFILL_URL || "";

function safe(url) {
  return url && !url.includes("/spreadsheets/") ? url : "";
}

/** The form link, pre-filled when a slot and a template are available, else null. */
export function requestFormUrl({ room, date, start, end } = {}) {
  const prefill = safe(PREFILL_URL);
  if (prefill && room && date && start && end) {
    return prefill
      .replace("{room}", encodeURIComponent(room))
      .replace("{date}", encodeURIComponent(date))
      .replace("{start}", encodeURIComponent(start))
      .replace("{end}", encodeURIComponent(end));
  }
  return safe(FORM_URL) || null;
}
