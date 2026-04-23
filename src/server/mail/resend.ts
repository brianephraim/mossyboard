import { Resend } from "resend";

import { getMailEnv } from "./config";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<{ id: string }> {
  const env = getMailEnv();
  const resend = new Resend(env.RESEND_API_KEY);

  const result = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  if (!result.data?.id) {
    throw new Error("Resend send did not return an id");
  }

  return { id: result.data.id };
}
