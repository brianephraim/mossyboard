import { Resend } from "resend";

import { getMailEnv } from "./config";
import { logger } from "../logging/logger";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function getEmailDebugParts(email: string) {
  const at = email.lastIndexOf("@");
  const local = at >= 0 ? email.slice(0, at) : email;
  const domain = at >= 0 ? email.slice(at + 1) : null;
  const plus = local.indexOf("+");
  const baseLocal = plus >= 0 ? local.slice(0, plus) : local;
  const tag = plus >= 0 ? local.slice(plus + 1) : null;

  return {
    domain,
    localLen: local.length,
    hasPlus: plus >= 0,
    baseLocalLen: baseLocal.length,
    tagLen: tag ? tag.length : 0,
  };
}

export async function sendEmail(input: SendEmailInput): Promise<{ id: string }> {
  const env = getMailEnv();
  const resend = new Resend(env.RESEND_API_KEY);

  logger.debug(
    {
      fromDomain: env.RESEND_FROM_EMAIL.split("@")[1] ?? null,
      to: getEmailDebugParts(input.to),
      subjectLen: input.subject.length,
      hasText: Boolean(input.text),
    },
    "mail.send.attempt",
  );

  const result = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (result.error) {
    logger.warn(
      {
        to: getEmailDebugParts(input.to),
        resendErrorName: (result.error as any).name ?? null,
        resendErrorMessage: result.error.message,
      },
      "mail.send.failed",
    );
    throw new Error(result.error.message);
  }

  if (!result.data?.id) {
    throw new Error("Resend send did not return an id");
  }

  logger.debug(
    { to: getEmailDebugParts(input.to), deliveryId: result.data.id },
    "mail.send.succeeded",
  );

  return { id: result.data.id };
}
