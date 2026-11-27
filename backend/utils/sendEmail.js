const nodemailer = require('nodemailer');

let transporter;

// Real SMTP (e.g. Gmail with an App Password) when SMTP_USER/SMTP_PASS are set,
// otherwise a throwaway Ethereal inbox whose preview link is logged to the console.
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

const sendOTPEmail = async (toEmail, otp) => {
  const transport = await getTransporter();

  const from = process.env.SMTP_USER
    ? `"TechConnect" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`
    : '"TechConnect" <no-reply@techconnect.test>';

  const info = await transport.sendMail({
    from,
    to: toEmail,
    subject: 'Your TechConnect Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: auto;">
        <h2>Verify your TechConnect account</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 5px;">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log('Preview URL:', previewUrl);
};

module.exports = sendOTPEmail;
