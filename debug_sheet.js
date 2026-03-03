const {google} = require('googleapis');
require('dotenv').config({path: '.env.local'});

async function test() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Get just the header row first
  const h = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "'Venue Reservation'!A1:P1",
  });

  console.log('=== HEADER ROW ===');
  h.data.values?.[0]?.forEach((cell, j) => {
    console.log(`  Col ${j} (${String.fromCharCode(65+j)}): "${cell}"`);
  });

  // Get one data row
  const d = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "'Venue Reservation'!A2:P2",
  });

  console.log('\n=== FIRST DATA ROW ===');
  d.data.values?.[0]?.forEach((cell, j) => {
    console.log(`  Col ${j} (${String.fromCharCode(65+j)}): "${cell}"`);
  });
}

test().catch(e => console.error('ERROR:', e.message));
