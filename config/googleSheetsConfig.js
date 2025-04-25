// googleSheetsConfig.js
const path = require('path');

module.exports = {
  // Your Google Sheet’s unique ID (from its URL)
  spreadsheetId: '15QeWtREpPzytxHbtPj4ajCkD3BstlbGxH2GzsdLbUF8',

  // The sheet/tab name you’re reading from
  sheetName: 'Sheet1',

  // The A–P range covering all 16 columns
  dataRange: `${'Sheet1'}!A:P`,

  // Path to your service account JSON key
  keyFile: path.join(__dirname, 'bestconnect-457519-797a26438c69.json'),

  // Required OAuth scopes for read-only access
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
};
