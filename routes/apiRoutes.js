const express = require('express');
const { google } = require('googleapis');
const router = express.Router();

// Service-account credentials from env var
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

// Your sheet ID & A–P range
const spreadsheetId = '15QeWtREpPzytxHbtPj4ajCkD3BstlbGxH2GzsdLbUF8';
const range = 'Sheet1!A:P';

router.get('/getData', async (req, res) => {
  console.log('▶️ GET /api/getData');
  try {
    const client = await auth.authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      valueRenderOption: 'FORMATTED_VALUE',
    });

    const values = result.data.values || [];
    console.log('🔢 fetched rows:', values.length, 'cols:', (values[0] || []).length);

    if (values.length < 2) {
      return res.status(404).send('No data found.');
    }

    res.json(values);
  } catch (err) {
    console.error('❌ Sheets API error:', err);
    res.status(500).send('Unable to fetch sheet data');
  }
});

module.exports = router;
