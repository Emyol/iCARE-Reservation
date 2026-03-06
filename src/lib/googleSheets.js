import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

/**
 * Real Google Sheet schema (from Google Form):
 * A: Confirmation Email (TRUE/FALSE sent status)
 * B: Confirmation Email (email body text)
 * C: Timestamp
 * D: Email Address
 * E: Do you agree?
 * F: Which room would you like to reserve?
 * G: Purpose of Reservation
 * H: Date for Reservation
 * I: Start Time
 * J: End Time
 * K: Expected Number of Attendees
 * L: Full Name (Last Name, First Name M.I.)
 * M: FEU Tech Email Address
 * N: Department/Office
 * O: Role/Designation
 * P: Will you need assistance with the room setup or equipment?
 * Q: Additional Notes or Requests
 */

const SHEET_TAB = "Venue Reservation";

// Column indices (0-based)
const COL = {
  CONFIRMATION_EMAIL: 0,
  CONFIRMATION_EMAIL_BODY: 1,
  TIMESTAMP: 2,
  EMAIL: 3,
  AGREE: 4,
  ROOM: 5,
  PURPOSE: 6,
  DATE: 7,
  START_TIME: 8,
  END_TIME: 9,
  ATTENDEES: 10,
  FULL_NAME: 11,
  FEU_EMAIL: 12,
  DEPARTMENT: 13,
  ROLE: 14,
  EQUIPMENT: 15,
  NOTES: 16,
};

function getAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: SCOPES,
  });
  return auth;
}

function getSheets() {
  const auth = getAuth();
  return google.sheets({ version: "v4", auth });
}

/**
 * Combine a date string and time string into an ISO 8601 datetime.
 * Handles various Google Forms date/time formats.
 */
function combineDateAndTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;

  try {
    // Parse date components directly to avoid timezone issues with Date constructor
    let year, month, day;

    // Try "YYYY-MM-DD" format
    const isoDateMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    // Try "MM/DD/YYYY" format
    const usDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);

    if (isoDateMatch) {
      year = parseInt(isoDateMatch[1], 10);
      month = parseInt(isoDateMatch[2], 10);
      day = parseInt(isoDateMatch[3], 10);
    } else if (usDateMatch) {
      month = parseInt(usDateMatch[1], 10);
      day = parseInt(usDateMatch[2], 10);
      year = parseInt(usDateMatch[3], 10);
    } else {
      // Fallback: try Date constructor for other formats (e.g. "Month DD, YYYY")
      const dateParsed = new Date(dateStr + " 00:00:00");
      if (isNaN(dateParsed.getTime())) return null;
      year = dateParsed.getFullYear();
      month = dateParsed.getMonth() + 1;
      day = dateParsed.getDate();
    }

    // Parse the time part — could be "HH:MM:SS", "HH:MM", "H:MM AM/PM", etc.
    let hours = 0;
    let minutes = 0;

    // Try "H:MM:SS AM/PM" or "H:MM AM/PM" format
    const ampmMatch = timeStr.match(
      /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i,
    );
    if (ampmMatch) {
      hours = parseInt(ampmMatch[1], 10);
      minutes = parseInt(ampmMatch[2], 10);
      const period = ampmMatch[4].toUpperCase();
      if (period === "PM" && hours !== 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
    } else {
      // Try 24-hour "HH:MM" or "HH:MM:SS"
      const h24Match = timeStr.match(/(\d{1,2}):(\d{2})/);
      if (h24Match) {
        hours = parseInt(h24Match[1], 10);
        minutes = parseInt(h24Match[2], 10);
      }
    }

    // Format as timezone-free ISO string to preserve the wall-clock time.
    // Using .toISOString() would convert to UTC and shift the time incorrectly.
    const pad = (n) => n.toString().padStart(2, "0");
    return `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00`;
  } catch {
    return null;
  }
}

/**
 * Read all reservations from the Google Sheet.
 * Maps the real form columns to our app's data shape.
 */
export async function getReservations() {
  const sheets = getSheets();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SHEET_TAB}'!A:Q`,
  });

  const rows = response.data.values;

  console.log("[DEBUG] Raw rows from sheet:", rows ? rows.length : 0);
  if (rows && rows.length > 1) {
    console.log("[DEBUG] Header row:", JSON.stringify(rows[0]));
    console.log("[DEBUG] First data row:", JSON.stringify(rows[1]));
  }

  if (!rows || rows.length <= 1) {
    return [];
  }

  // Skip header row (index 0)
  const dataRows = rows.slice(1);

  return dataRows
    .map((row, idx) => {
      const room = row[COL.ROOM] || "";
      const purpose = row[COL.PURPOSE] || "";
      const dateStr = row[COL.DATE] || "";
      const startTimeStr = row[COL.START_TIME] || "";
      const endTimeStr = row[COL.END_TIME] || "";
      const fullName = row[COL.FULL_NAME] || "";
      const timestamp = row[COL.TIMESTAMP] || "";
      const emailSent = (row[COL.CONFIRMATION_EMAIL] || "").toUpperCase() === "TRUE";
      // Use FEU Tech Email (col M) first, then Email Address (col D)
      const recipientEmail = row[COL.FEU_EMAIL] || row[COL.EMAIL] || "";

      const startTime = combineDateAndTime(dateStr, startTimeStr);
      const endTime = combineDateAndTime(dateStr, endTimeStr);

      // Skip rows with invalid/missing dates
      if (!startTime || !endTime) return null;

      return {
        timestamp,
        room,
        eventName: purpose || fullName || "Reservation",
        startTime,
        endTime,
        fullName,
        department: row[COL.DEPARTMENT] || "",
        attendees: row[COL.ATTENDEES] || "",
        emailSent,
        recipientEmail,
        rowIndex: idx + 2, // +2 because: +1 for header, +1 for 1-based row numbers
      };
    })
    .filter(Boolean);
}

/**
 * Append a new reservation row to the Google Sheet.
 * Admin manual bookings fill the relevant columns, leaving form-only columns empty.
 */
export async function appendReservation({
  room,
  eventName,
  startTime,
  endTime,
  fullName = "Admin",
  email = "",
  attendees = "",
}) {
  const sheets = getSheets();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Parse datetime components directly from the timezone-free string
  // to avoid server timezone issues. Input format: "YYYY-MM-DDTHH:MM" or "YYYY-MM-DDTHH:MM:SS"
  function parseDateTimeParts(dtStr) {
    const match = dtStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (match) {
      return {
        year: parseInt(match[1], 10),
        month: parseInt(match[2], 10),
        day: parseInt(match[3], 10),
        hours: parseInt(match[4], 10),
        minutes: parseInt(match[5], 10),
      };
    }
    // Fallback for other formats — use Date (server-local)
    const d = new Date(dtStr);
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hours: d.getHours(),
      minutes: d.getMinutes(),
    };
  }

  const startParts = parseDateTimeParts(startTime);
  const endParts = parseDateTimeParts(endTime);

  // Format date as "MM/DD/YYYY" for the Date column
  const pad2 = (n) => n.toString().padStart(2, "0");
  const dateFormatted = `${pad2(startParts.month)}/${pad2(startParts.day)}/${startParts.year}`;

  // Format times as "HH:MM AM/PM"
  const formatTime = (parts) => {
    let h = parts.hours;
    const m = parts.minutes.toString().padStart(2, "0");
    const period = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${period}`;
  };

  const timestamp = new Date().toLocaleString();

  // Build row matching the 17-column schema (A:Q)
  // A: Confirmation Email (sent status) → empty (admin booking)
  // B: Confirmation Email (body text)   → empty (admin booking)
  // C: Timestamp           → current time
  // D: Email Address       → empty
  // E: Do you agree?       → "Yes"
  // F: Room                → room
  // G: Purpose             → eventName
  // H: Date                → date
  // I: Start Time          → formatted
  // J: End Time            → formatted
  // K: Attendees           → empty
  // L: Full Name           → "Admin"
  // M: FEU Email           → empty
  // N: Department          → "Administration"
  // O: Role                → "Administrator"
  // P: Equipment           → empty
  // Q: Notes               → "Manual booking via iCARE Dashboard"
  const newRow = [
    "", // A: Confirmation Email (status)
    "", // B: Confirmation Email (body)
    timestamp, // C: Timestamp
    email, // D: Email Address
    "Yes", // E: Do you agree?
    room, // F: Room
    eventName, // G: Purpose of Reservation
    dateFormatted, // H: Date for Reservation
    formatTime(startParts), // I: Start Time
    formatTime(endParts), // J: End Time
    attendees, // K: Expected Number of Attendees
    fullName, // L: Full Name
    email, // M: FEU Tech Email Address
    "Administration", // N: Department/Office
    "Administrator", // O: Role/Designation
    "", // P: Equipment assistance
    "Manual booking via iCARE Dashboard", // Q: Additional Notes
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${SHEET_TAB}'!A:Q`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [newRow],
    },
  });

  // Return timezone-free strings consistent with getReservations()
  return {
    timestamp,
    room,
    eventName,
    startTime,
    endTime,
    fullName,
    recipientEmail: email,
    emailSent: false,
  };
}

/**
 * Update the email-sent status (column A) for a specific row.
 * Also stores a note in column B about when/how the email was sent.
 */
export async function updateEmailStatus(rowIndex, emailNote = "") {
  const sheets = getSheets();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${SHEET_TAB}'!A${rowIndex}:B${rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [["TRUE", emailNote || `Sent via iCARE on ${new Date().toLocaleString()}`]],
    },
  });
}

/**
 * Update a reservation row in-place (columns F–Q).
 * Only provided fields are updated; others are preserved.
 */
export async function updateReservation(rowIndex, fields) {
  const sheets = getSheets();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Fetch current row to preserve unchanged columns
  const current = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${SHEET_TAB}'!A${rowIndex}:Q${rowIndex}`,
  });
  const row = current.data.values?.[0] || new Array(17).fill("");

  // Helper for date/time formatting
  const pad2 = (n) => n.toString().padStart(2, "0");
  function parseDateTimeParts(dtStr) {
    const match = dtStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (match) {
      return {
        year: parseInt(match[1], 10),
        month: parseInt(match[2], 10),
        day: parseInt(match[3], 10),
        hours: parseInt(match[4], 10),
        minutes: parseInt(match[5], 10),
      };
    }
    const d = new Date(dtStr);
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hours: d.getHours(),
      minutes: d.getMinutes(),
    };
  }
  const formatTime = (parts) => {
    let h = parts.hours;
    const m = parts.minutes.toString().padStart(2, "0");
    const period = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${period}`;
  };

  // Apply updates
  if (fields.room !== undefined) row[COL.ROOM] = fields.room;
  if (fields.eventName !== undefined) row[COL.PURPOSE] = fields.eventName;
  if (fields.fullName !== undefined) row[COL.FULL_NAME] = fields.fullName;
  if (fields.attendees !== undefined) row[COL.ATTENDEES] = fields.attendees;
  if (fields.email !== undefined) {
    row[COL.EMAIL] = fields.email;
    row[COL.FEU_EMAIL] = fields.email;
  }

  if (fields.startTime) {
    const sp = parseDateTimeParts(fields.startTime);
    row[COL.DATE] = `${pad2(sp.month)}/${pad2(sp.day)}/${sp.year}`;
    row[COL.START_TIME] = formatTime(sp);
  }
  if (fields.endTime) {
    const ep = parseDateTimeParts(fields.endTime);
    row[COL.END_TIME] = formatTime(ep);
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${SHEET_TAB}'!A${rowIndex}:Q${rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row],
    },
  });
}

/**
 * Delete a reservation by clearing the row content (preserves row numbering).
 */
export async function deleteReservation(rowIndex) {
  const sheets = getSheets();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const emptyRow = new Array(17).fill("");
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${SHEET_TAB}'!A${rowIndex}:Q${rowIndex}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [emptyRow],
    },
  });
}

/**
 * Append an entry to the Audit Log sheet tab.
 * Auto-creates the tab with headers if it doesn't exist.
 */
const AUDIT_TAB = "Audit Log";

export async function appendAuditLog({ action, admin, details, targetRow }) {
  const sheets = getSheets();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  // Ensure the Audit Log tab exists
  try {
    await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${AUDIT_TAB}'!A1`,
    });
  } catch {
    // Tab doesn't exist — create it with headers
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: AUDIT_TAB } } }],
      },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${AUDIT_TAB}'!A1:E1`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [["Timestamp", "Admin", "Action", "Target Row", "Details"]],
      },
    });
  }

  const timestamp = new Date().toLocaleString();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${AUDIT_TAB}'!A:E`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[timestamp, admin || "System", action, targetRow || "", details || ""]],
    },
  });
}

/**
 * Read all audit log entries.
 */
export async function getAuditLog() {
  const sheets = getSheets();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${AUDIT_TAB}'!A:E`,
    });
    const rows = response.data.values;
    if (!rows || rows.length <= 1) return [];
    return rows.slice(1).map((row) => ({
      timestamp: row[0] || "",
      admin: row[1] || "",
      action: row[2] || "",
      targetRow: row[3] || "",
      details: row[4] || "",
    }));
  } catch {
    return [];
  }
}
