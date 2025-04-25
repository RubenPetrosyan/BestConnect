// api/getData.js

export default function handler(req, res) {
    try {
      const creds = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
  
      if (!creds) {
        return res.status(500).json({
          error: 'Missing GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable',
        });
      }
  
      let parsed;
      try {
        parsed = JSON.parse(creds);
      } catch (e) {
        return res.status(500).json({
          error: 'Failed to parse credentials JSON',
          details: e.message,
        });
      }
  
      return res.status(200).json({
        success: true,
        client_email: parsed.client_email,
        project_id: parsed.project_id,
      });
  
    } catch (err) {
      return res.status(500).json({
        error: 'Unexpected error',
        details: err.message,
      });
    }
  }
  