const express = require('express');
const { google } = require('googleapis');
const path = require('path');
const router = express.Router();

// Service-account JSON
const keyPath = path.join(__dirname, '..', 'bestconnect-457519-797a26438c69.json');
const auth    = new google.auth.GoogleAuth({
  keyFile: keyPath,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

// Your sheet ID & A–P range
const spreadsheetId = '15QeWtREpPzytxHbtPj4ajCkD3BstlbGxH2GzsdLbUF8';
const range         = 'Sheet1!A:P';

router.get('/getData', async (req, res) => {
  console.log('▶️ GET /api/getData');
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    // EXACTLY the same call as testGoogleSheet.js
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

    // Send header + all data rows
    res.json(values);
  } catch (err) {
    console.error('❌ Sheets API error:', err);
    res.status(500).send('Unable to fetch sheet data');
  }
});

module.exports = router;
