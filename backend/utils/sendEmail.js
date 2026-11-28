const nodemailer = require('nodemailer');

// Sends through one of three options, in this order:
// 1. Brevo's HTTPS API when BREVO_API_KEY is set. Use this on Render: its free plan
//    blocks the SMTP ports (25, 465, 587), but HTTPS requests go through.
// 2. Real SMTP (e.g. Gmail with an App Password) when SMTP_USER/SMTP_PASS are set.
// 3. A throwaway Ethereal inbox whose preview link is logged to the console.

let transporter;

const getTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = Number(process.env.SMTP_PORT) || 465;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return transporter;
  }

  const testAccount = await nodemailer.createTestAccount();

  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return transporter;
};

const sendWithBrevo = async ({ fromEmail, to, subject, html }) => {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'TechConnect', email: fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const details = await res.text();
    throw new Error(`Brevo rejected the email (${res.status}): ${details}`);
  }
};

const sendOTPEmail = async (toEmail, otp) => {
  const subject = 'Your TechConnect Verification Code';
  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto;">
        <h2>Verify your TechConnect account</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 5px;">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
      </div>
    `;

  if (process.env.BREVO_API_KEY) {
    // The sender must be an address verified in Brevo (Senders, Domains & Dedicated IPs)
    const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;
    await sendWithBrevo({ fromEmail, to: toEmail, subject, html });
    return;
  }

  const transport = await getTransporter();

  const from = process.env.SMTP_USER
    ? `"TechConnect" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`
    : '"TechConnect" <no-reply@techconnect.test>';

  const info = await transport.sendMail({ from, to: toEmail, subject, html });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log('Preview URL:', previewUrl);
};

module.exports = sendOTPEmail;
