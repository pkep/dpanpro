/**
 * Shared Twilio SMS Sender
 * Centralizes phone formatting and Twilio API calls.
 */

/**
 * Format a French phone number to international format (+33...)
 */
export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\.]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "+33" + cleaned.substring(1);
  }
  if (!cleaned.startsWith("+")) {
    cleaned = "+33" + cleaned;
  }
  return cleaned;
}

/**
 * Send an SMS via Twilio.
 * Automatically reads TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER from env.
 * @param to - Recipient phone number (will be auto-formatted)
 * @param message - SMS body text
 * @param logPrefix - Optional prefix for console logs (e.g. "[MyFunction]")
 * @returns true if sent successfully
 */
export async function sendSMS(to: string, message: string, logPrefix = "[SMS]"): Promise<boolean> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const messagingSid = Deno.env.get("TWILIO_MESSAGING_SID");

  if (!accountSid || !authToken || !messagingSid) {
    console.log(`${logPrefix} Twilio credentials not configured, skipping SMS`);
    return false;
  }

  const formattedTo = formatPhoneNumber(to);
  console.log(`${logPrefix} Sending SMS to: ${formattedTo}`);

  try {
    const credentials = btoa(`${accountSid}:${authToken}`);
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: formattedTo,
        MessagingServiceSid: messagingSid,
        Body: message,
      }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`${logPrefix} SMS sent successfully: ${result.sid}`);
      return true;
    } else {
      console.error(`${logPrefix} Twilio error:`, result);
      return false;
    }
  } catch (error) {
    console.error(`${logPrefix} Error sending SMS:`, error);
    return false;
  }
}
