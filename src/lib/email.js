import nodemailer from "nodemailer";

/**
 * Parse ADMIN_ACCOUNTS env var.
 * Format: JSON array of { username, password, name, email, smtpPassword }
 */
export function getAdminAccounts() {
  try {
    const raw = process.env.ADMIN_ACCOUNTS;
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    console.error("Failed to parse ADMIN_ACCOUNTS env var");
    return [];
  }
}

/**
 * Find an admin by username.
 */
export function findAdmin(username) {
  return getAdminAccounts().find((a) => a.username === username) || null;
}

/**
 * Get all admin emails except the given username (for CC).
 */
export function getAllAdminEmails(excludeUsername = "") {
  return getAdminAccounts()
    .filter((a) => a.username !== excludeUsername && a.email)
    .map((a) => a.email);
}

/**
 * Create a Nodemailer transporter for a specific admin's Outlook account.
 */
function createTransporter(admin) {
  return nodemailer.createTransport({
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false,
    auth: {
      user: admin.email,
      pass: admin.smtpPassword,
    },
    tls: {
      ciphers: "SSLv3",
    },
  });
}

/* ─── Time formatting helpers ─── */

function formatDateForEmail(dtStr) {
  const match = dtStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const d = new Date(
      parseInt(match[1]),
      parseInt(match[2]) - 1,
      parseInt(match[3]),
    );
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  return dtStr;
}

function formatTimeForEmail(dtStr) {
  const match = dtStr.match(/T(\d{2}):(\d{2})/);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    const period = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${period}`;
  }
  return dtStr;
}

/* ─── HTML Email Templates ─── */

function emailWrapper(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5,#0d9488);padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.02em;">🏫 iCARE Room Reservation</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">FEU Institute of Technology</p>
          </td>
        </tr>
        ${content}
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
            <p style="margin:0;color:#64748b;font-size:11px;">This is an automated message from the iCARE Room Reservation System.</p>
            <p style="margin:4px 0 0;color:#475569;font-size:11px;">© ${new Date().getFullYear()} FEU Institute of Technology</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildConfirmationHtml({
  fullName,
  room,
  eventName,
  date,
  startTime,
  endTime,
  adminName,
}) {
  return emailWrapper(`
    <tr>
      <td style="padding:32px;">
        <div style="background:#065f46;border-left:4px solid #10b981;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0;color:#6ee7b7;font-size:15px;font-weight:700;">✅ Reservation Confirmed</p>
          <p style="margin:6px 0 0;color:#a7f3d0;font-size:13px;">Your room reservation has been approved and scheduled.</p>
        </div>

        <p style="color:#e2e8f0;font-size:14px;margin:0 0 20px;">Dear <strong>${fullName || "Reservant"}</strong>,</p>
        <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;line-height:1.6;">
          We are pleased to confirm your room reservation. Below are the details:
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;border:1px solid rgba(255,255,255,0.06);margin-bottom:24px;">
          <tr>
            <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Room</p>
              <p style="margin:4px 0 0;color:#f1f5f9;font-size:14px;font-weight:600;">${room}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Purpose / Event</p>
              <p style="margin:4px 0 0;color:#f1f5f9;font-size:14px;font-weight:600;">${eventName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Date</p>
              <p style="margin:4px 0 0;color:#f1f5f9;font-size:14px;font-weight:600;">${date}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 20px;">
              <p style="margin:0;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Time</p>
              <p style="margin:4px 0 0;color:#f1f5f9;font-size:14px;font-weight:600;">${startTime} — ${endTime}</p>
            </td>
          </tr>
        </table>

        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">
          If you need to make changes or cancel, please contact the iCARE administration.
        </p>
        <p style="color:#64748b;font-size:12px;margin:16px 0 0;">— ${adminName || "iCARE Administration"}</p>
      </td>
    </tr>
  `);
}

function buildConflictHtml({
  fullName,
  room,
  eventName,
  date,
  startTime,
  endTime,
  conflictStart,
  conflictEnd,
  conflictEvent,
  adminName,
}) {
  return emailWrapper(`
    <tr>
      <td style="padding:32px;">
        <div style="background:#78350f;border-left:4px solid #f59e0b;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0;color:#fcd34d;font-size:15px;font-weight:700;">⚠️ Schedule Conflict Detected</p>
          <p style="margin:6px 0 0;color:#fde68a;font-size:13px;">Your requested time slot overlaps with an existing reservation.</p>
        </div>

        <p style="color:#e2e8f0;font-size:14px;margin:0 0 20px;">Dear <strong>${fullName || "Reservant"}</strong>,</p>
        <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;line-height:1.6;">
          We noticed that your reservation request conflicts with an existing booking. Please review the details below:
        </p>

        <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;font-weight:700;">Your Requested Reservation</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;border:1px solid rgba(255,255,255,0.06);margin-bottom:20px;">
          <tr>
            <td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;color:#64748b;font-size:11px;">Room</p>
              <p style="margin:4px 0 0;color:#f1f5f9;font-size:14px;font-weight:600;">${room}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;color:#64748b;font-size:11px;">Purpose / Event</p>
              <p style="margin:4px 0 0;color:#f1f5f9;font-size:14px;font-weight:600;">${eventName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 20px;">
              <p style="margin:0;color:#64748b;font-size:11px;">Requested Time</p>
              <p style="margin:4px 0 0;color:#f1f5f9;font-size:14px;font-weight:600;">${date} · ${startTime} — ${endTime}</p>
            </td>
          </tr>
        </table>

        <p style="color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;font-weight:700;">Existing Reservation (Conflict)</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1c1917;border-radius:8px;border:1px solid #f59e0b33;margin-bottom:24px;">
          <tr>
            <td style="padding:14px 20px;border-bottom:1px solid rgba(245,158,11,0.15);">
              <p style="margin:0;color:#92400e;font-size:11px;">Event</p>
              <p style="margin:4px 0 0;color:#fbbf24;font-size:14px;font-weight:600;">${conflictEvent || "Reserved"}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 20px;">
              <p style="margin:0;color:#92400e;font-size:11px;">Booked Time</p>
              <p style="margin:4px 0 0;color:#fbbf24;font-size:14px;font-weight:600;">${conflictStart} — ${conflictEnd}</p>
            </td>
          </tr>
        </table>

        <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0;">
          Please choose a different time slot or contact the iCARE administration to resolve this conflict.
        </p>
        <p style="color:#64748b;font-size:12px;margin:16px 0 0;">— ${adminName || "iCARE Administration"}</p>
      </td>
    </tr>
  `);
}

/* ─── Email sending functions ─── */

/**
 * Send a reservation confirmation email.
 */
export async function sendConfirmationEmail({ admin, reservation }) {
  const transporter = createTransporter(admin);
  const ccEmails = getAllAdminEmails(admin.username);

  const { room, eventName, startTime, endTime, fullName } = reservation;
  const recipientEmail = reservation.recipientEmail || reservation.email;

  if (!recipientEmail) {
    throw new Error("No recipient email address available");
  }

  const html = buildConfirmationHtml({
    fullName,
    room,
    eventName,
    date: formatDateForEmail(startTime),
    startTime: formatTimeForEmail(startTime),
    endTime: formatTimeForEmail(endTime),
    adminName: admin.name,
  });

  const mailOptions = {
    from: `"iCARE Room Reservation" <${admin.email}>`,
    to: recipientEmail,
    cc: ccEmails.length > 0 ? ccEmails.join(", ") : undefined,
    subject: `✅ Reservation Confirmed — ${room.split(" /")[0] || room}`,
    html,
  };

  return transporter.sendMail(mailOptions);
}

/**
 * Send a conflict notification email.
 */
export async function sendConflictEmail({
  admin,
  reservation,
  conflictingReservation,
}) {
  const transporter = createTransporter(admin);
  const ccEmails = getAllAdminEmails(admin.username);

  const { room, eventName, startTime, endTime, fullName } = reservation;
  const recipientEmail = reservation.recipientEmail || reservation.email;

  if (!recipientEmail) {
    throw new Error("No recipient email address available");
  }

  const html = buildConflictHtml({
    fullName,
    room,
    eventName,
    date: formatDateForEmail(startTime),
    startTime: formatTimeForEmail(startTime),
    endTime: formatTimeForEmail(endTime),
    conflictStart: formatTimeForEmail(conflictingReservation.startTime),
    conflictEnd: formatTimeForEmail(conflictingReservation.endTime),
    conflictEvent: conflictingReservation.eventName,
    adminName: admin.name,
  });

  const mailOptions = {
    from: `"iCARE Room Reservation" <${admin.email}>`,
    to: recipientEmail,
    cc: ccEmails.length > 0 ? ccEmails.join(", ") : undefined,
    subject: `⚠️ Schedule Conflict — ${room.split(" /")[0] || room}`,
    html,
  };

  return transporter.sendMail(mailOptions);
}

/**
 * Check for conflicting reservations (same room, overlapping time).
 * Returns the first conflicting reservation or null.
 */
export function findConflict(reservation, allReservations) {
  const room = reservation.room;
  const start = new Date(reservation.startTime);
  const end = new Date(reservation.endTime);

  for (const existing of allReservations) {
    if (existing.room !== room) continue;
    // Skip self (if this reservation is already in the list)
    if (
      existing.startTime === reservation.startTime &&
      existing.endTime === reservation.endTime &&
      existing.eventName === reservation.eventName
    )
      continue;

    const exStart = new Date(existing.startTime);
    const exEnd = new Date(existing.endTime);

    // Check overlap: two ranges overlap if start < exEnd AND end > exStart
    if (start < exEnd && end > exStart) {
      return existing;
    }
  }
  return null;
}
