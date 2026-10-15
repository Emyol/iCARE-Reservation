# iCARE Room Reservation

Room availability and booking for the iCARE Audio-Visual Room (40 people) and
Training Room (10 people) at FEU Institute of Technology.

- **Public:** see when each room is free (day, week, or "find a time" for a group
  size) and open the iCARE request form for a free slot.
- **Staff:** review requests, resolve overlapping bookings, book rooms directly,
  and send confirmation or room-not-available emails.

Live: https://icare-reservation.vercel.app

## Pages

| Page | Who | What it's for |
|---|---|---|
| `/availability` | Everyone | Day grid (agenda on phones), week summary, Find a time. `?date=YYYY-MM-DD` opens a day. Staff also get a pass column and New booking. |
| `/schedule` | Everyone | Month calendar; links a day to Availability. |
| `/reports` | Everyone | Totals per room and bookings per month. |
| `/requests` | Staff | Requests to review: overlaps first, then pending requests. Confirm or decline by email. Search and views. |
| `/conflicts` | Staff | Upcoming overlapping bookings, with Open to fix them. |
| `/activity` | Staff | Log of bookings staff created, edited, or deleted. |

`/`, `/dashboard` and `/rooms` redirect to `/availability`.

## How it works

- **Data:** a Google Sheet filled by the request Google Form (tab "Venue
  Reservation", columns A–Q, see `src/lib/googleSheets.js`). The app reads and
  writes it through a service account. Admin actions are logged to an "Audit Log"
  tab (created automatically).
- **Request status:** there is no status column. It's read from the email
  columns (`statusOf` in `src/lib/reservationRules.js`):
  - no email sent yet: **Pending**
  - column B starts "Conflict notice sent": **Declined**
  - any other email sent: **Confirmed**

  Declined requests no longer hold the room anywhere in the app.
- **Privacy:** signed-out visitors get room and time only; every booking is shown
  as "Reserved" (`publicReservations`).
- **Times** are Philippine wall-clock strings (`YYYY-MM-DDTHH:MM`) throughout,
  so nothing depends on the viewer's time zone.
- **Look:** "Liquid Glass" styles in `src/app/liquid-glass.css`, shared pieces
  in `src/components/glass/`. Motion uses framer-motion and respects reduced
  motion.

## Environment variables

| Name | Required | Purpose |
|---|---|---|
| `GOOGLE_SHEET_ID` | Yes | The response spreadsheet's ID. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` | Yes | Service account with edit access to the sheet. |
| `JWT_SECRET` | Yes | Signs the staff session cookie. |
| `ADMIN_ACCOUNTS` | For email | JSON array of `{ username, password, name, email, smtpPassword }`. Each staff member signs in with their own account and emails go out from their Outlook address, with the others CC'd. Without it the app falls back to `ADMIN_PASSWORD` and **cannot send email**. |
| `ADMIN_PASSWORD` | Fallback | Single shared staff password, used only when `ADMIN_ACCOUNTS` is unset. |
| `NEXT_PUBLIC_REQUEST_FORM_URL` | Yes | The Google Form's share link, for the public "Request" button. Never the response sheet. |
| `NEXT_PUBLIC_REQUEST_FORM_PREFILL_URL` | No | A "Get pre-filled link" URL with answers `{room}`, `{date}`, `{start}`, `{end}`, so the form opens filled in. |

Put local values in `.env.local` (git-ignored). `NEXT_PUBLIC_*` values are baked
in at build time, so redeploy after changing them.

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # unit tests (node:test) for the date, availability and booking rules
npm run lint
npm run build
```
