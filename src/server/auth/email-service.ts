import { createEmailVerificationLink, createPasswordResetLink } from "./action-links";
import { sendEmail } from "../mail/delivery";

export async function sendVerificationEmail(email: string): Promise<{ deliveryId: string }> {
  const link = await createEmailVerificationLink(email);
  const { id } = await sendEmail({
    to: email,
    subject: "Verify your email",
    html: `<p>Verify your email:</p><p><a href="${link}">Verify email</a></p>`,
    text: `Verify your email: ${link}`,
  });
  return { deliveryId: id };
}

export async function sendPasswordResetEmail(email: string): Promise<{ deliveryId: string }> {
  const link = await createPasswordResetLink(email);
  const { id } = await sendEmail({
    to: email,
    subject: "Reset your password",
    html: `<p>Reset your password:</p><p><a href="${link}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
    text: `Reset your password: ${link}\n\nIf you did not request this, you can ignore this email.`,
  });
  return { deliveryId: id };
}
