/**
 * Microsoft Graph API helper for sending emails via Outlook.
 * Uses OAuth 2.0 client credentials flow.
 */

async function getAccessToken() {
  const tenantId = process.env.MICROSOFT_GRAPH_TENANT_ID;
  const clientId = process.env.MICROSOFT_GRAPH_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_GRAPH_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    console.warn('[MS Graph Helper]: Microsoft Graph API credentials are not fully configured in environment variables.');
    return null;
  }

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to retrieve Graph token: ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('[MS Graph Helper] Token error:', error.message);
    return null;
  }
}

/**
 * Sends an email using the Microsoft Graph API.
 * 
 * @param {string} toEmail - The recipient's email address.
 * @param {string} subject - The subject line.
 * @param {string} bodyContent - The plain text body content.
 * @returns {Promise<boolean>} True if successful or printed to console as mock.
 */
async function sendMail(toEmail, subject, bodyContent) {
  const senderEmail = process.env.OUTLOOK_SENDER_EMAIL;

  console.log(`[Email Dispatcher]:
  To: ${toEmail}
  From: ${senderEmail || 'noreply@cybernara.com'}
  Subject: ${subject}
  Body:
  ${bodyContent}
  `);

  if (!senderEmail) {
    console.warn('[MS Graph Helper]: OUTLOOK_SENDER_EMAIL is not defined. Email logged to console.');
    return true;
  }

  const token = await getAccessToken();
  if (!token) {
    console.warn('[MS Graph Helper]: Access token could not be obtained. Email logged to console.');
    return true; // Return true to prevent blocking application flows during dev/mock
  }

  const url = `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`;
  const payload = {
    message: {
      subject: subject,
      body: {
        contentType: 'Text',
        content: bodyContent
      },
      toRecipients: [
        {
          emailAddress: {
            address: toEmail
          }
        }
      ]
    },
    saveToSentItems: false
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[MS Graph Helper] Send error: ${response.status} ${response.statusText} - ${errText}`);
      return false;
    }

    console.log(`[MS Graph Helper]: Email sent successfully to ${toEmail}`);
    return true;
  } catch (error) {
    console.error('[MS Graph Helper] Send network error:', error.message);
    return false;
  }
}

module.exports = {
  sendMail
};
