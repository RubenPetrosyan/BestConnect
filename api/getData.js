// api/getData.js
const { google } = require('googleapis');
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const spreadsheetId = '15QeWtREpPzytxHbtPj4ajCkD3BstlbGxH2GzsdLbUF8';
const range = 'Sheet1!A:P';

export default async function handler(req, res) {
  try {
    const client = await auth.authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      valueRenderOption: 'FORMATTED_VALUE',
    });

    const values = response.data.values || [];
    res.status(200).json(values);
  } catch (err) {
    console.error('❌ Error fetching Google Sheet:', err.message);
    res.status(500).json({ error: 'Failed to fetch sheet data.' });
  }
}
