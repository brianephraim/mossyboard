import { createEmailVerificationLink, createPasswordResetLink } from "./action-links";
import { sendEmail } from "../mail/resend";

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
    html: `<p>Reset your password:</p><p><a href="${link}">Reset password</a></p>`,
    text: `Reset your password: ${link}`,
  });
  return { deliveryId: id };
}
