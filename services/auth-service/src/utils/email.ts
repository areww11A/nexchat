import nodemailer from 'nodemailer';
import { config } from '../config';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
});

export const sendRecoveryEmail = async (email: string, code: string): Promise<void> => {
  const mailOptions = {
    from: config.email.from,
    to: email,
    subject: 'Password Recovery Code',
    html: `
      <h1>Password Recovery</h1>
      <p>Your recovery code is: <strong>${code}</strong></p>
      <p>This code will expire in 30 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}; 