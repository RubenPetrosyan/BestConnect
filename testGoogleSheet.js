// testGoogleSheet.js
const { google } = require('googleapis');

async function fetchAll() {
  // 1) Authenticate using your service account JSON
  const auth = new google.auth.GoogleAuth({
    keyFile: './bestconnect-457519-797a26438c69.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const client = await auth.getClient();

  // 2) Build the sheets client
  const sheets = google.sheets({ version: 'v4', auth: client });

  // 3) Fetch A–P from every row
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: '15QeWtREpPzytxHbtPj4ajCkD3BstlbGxH2GzsdLbUF8',
    range: 'Sheet1!A:P',
    valueRenderOption: 'FORMATTED_VALUE',
  });

  // 4) Log what you got
  console.log('Fetched rows:', resp.data.values.length);
  console.log(JSON.stringify(resp.data.values, null, 2));
}

fetchAll().catch(err => {
  console.error('Error fetching sheet:', err);
});
