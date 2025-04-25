// /api/getData.js
import { google } from 'googleapis';

export default async function handler(req, res) {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const spreadsheetId = '15QeWtREpPzytxHbtPj4ajCkD3BstlbGxH2GzsdLbUF8';
    const range = 'Sheet1!A:P';

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const values = result.data.values || [];
    res.status(200).json(values);
  } catch (err) {
    console.error('❌ Error in getData.js:', err.message);
    res.status(500).json({ error: 'Server error', message: err.message });
  }
}
