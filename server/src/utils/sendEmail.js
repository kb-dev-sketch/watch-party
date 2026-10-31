import nodemailer from "nodemailer";

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;
  const { EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be configured to send email");
  }
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: EMAIL_USER, pass: EMAIL_PASS.replace(/\s/g, "") },
  });
  return transporter;
};

export async function sendPasswordResetEmail({ email, username, resetUrl }) {
  const safeUsername = username.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
  await getTransporter().sendMail({
    from: `Watch Party <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Reset your Watch Party password",
    text: `Hi ${username}, use this link to reset your Watch Party password: ${resetUrl}. The link expires in 1 hour. If you did not request this, ignore this email.`,
    html: `<p>Hi ${safeUsername},</p><p>We received a request to reset your Watch Party password.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in 1 hour. If you did not request this, ignore this email.</p>`,
  });
}
