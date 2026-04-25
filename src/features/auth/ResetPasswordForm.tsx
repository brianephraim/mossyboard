import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@tamagui/button";
import { Text } from "@tamagui/core";
import { YStack } from "@tamagui/stacks";

import { FormRoot, FormTextField } from "../../form";
import { trpc } from "../../trpc/client";
import { mapPasswordResetSendError } from "./firebase-auth-errors";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ResetValues = {
  email: string;
};

type ResetPasswordFormProps = Readonly<{
  redirectTo: string;
  formHeadingRef: RefObject<HTMLElement | null>;
}>;

export function ResetPasswordForm({ redirectTo, formHeadingRef }: ResetPasswordFormProps) {
  const navigate = useNavigate({ from: "/auth" });
  const prefillEmail = useRouterState({
    select: (s) => (s.location.state as { prefillEmail?: string } | undefined)?.prefillEmail ?? "",
  });
  const successRef = useRef<HTMLDivElement>(null);
  const [cooldown, setCooldown] = useState(0);
  const [sendSucceeded, setSendSucceeded] = useState(false);

  const form = useForm<ResetValues>({
    defaultValues: { email: prefillEmail },
    mode: "onSubmit",
  });

  useEffect(() => {
    if (prefillEmail) {
      form.setValue("email", prefillEmail);
    }
  }, [form, prefillEmail]);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const id = window.setInterval(() => {
      setCooldown((s) => Math.max(0, s - 1));
    }, 1000);

    return () => window.clearInterval(id);
  }, [cooldown]);

  const sendReset = trpc.authEmail.sendPasswordReset.useMutation({
    retry: false,
  });

  return (
    <FormRoot
      form={form}
      gap="$4"
      onSubmit={async (values) => {
        if (cooldown > 0) {
          return;
        }

        form.clearErrors("root");
        setSendSucceeded(false);
        try {
          await sendReset.mutateAsync({ email: values.email.trim() });
          setSendSucceeded(true);
          setCooldown(30);
          successRef.current?.focus();
        } catch (err) {
          const message = mapPasswordResetSendError(err);
          form.setError("root", { message });
        }
      }}
      onError={(errors) => {
        if (errors.email) {
          void form.setFocus("email");
        }
      }}
    >
      <Text
        ref={formHeadingRef as RefObject<HTMLSpanElement>}
        tabIndex={-1}
        tag="h2"
        fontSize="$8"
        fontWeight="800"
        color="$color12"
      >
        Reset password
      </Text>

      <Text color="$color11">Enter your email and we&apos;ll send a password reset link.</Text>

      <FormTextField<ResetValues, "email">
        name="email"
        label="Email"
        rules={{
          required: "Enter your email.",
          maxLength: { value: 320, message: "Email is too long." },
          validate: (value) => {
            const trimmed = value.trim();
            if (!trimmed) {
              return "Enter your email.";
            }

            if (!emailPattern.test(trimmed)) {
              return "Enter a valid email address.";
            }

            return true;
          },
        }}
        fieldProps={{ gap: "$2" }}
        labelProps={{ fontWeight: "600", color: "$color12" }}
        placeholder="you@example.com"
        type="email"
        inputMode="email"
        autoCapitalize="none"
        autoComplete="email"
        defaultBorderColor="$borderColor"
        additionalDescribedBy={sendSucceeded ? "reset-success" : undefined}
      />

      {form.formState.errors.root ? (
        <YStack
          borderWidth={1}
          borderColor="$red8"
          backgroundColor="$red2"
          padding="$3"
          borderRadius="$4"
          gap="$2"
        >
          <Text fontWeight="700" color="$red11">
            Request failed
          </Text>
          <Text color="$red11">{form.formState.errors.root.message}</Text>
        </YStack>
      ) : null}

      {sendSucceeded ? (
        <YStack
          ref={successRef}
          tabIndex={-1}
          borderWidth={1}
          borderColor="$green8"
          backgroundColor="$green2"
          padding="$3"
          borderRadius="$4"
          gap="$2"
        >
          <Text id="reset-success" fontWeight="700" color="$green11">
            Password reset email sent. Check your inbox for the reset link.
          </Text>
          {cooldown > 0 ? (
            <Text color="$green11">You can request another email in {cooldown} seconds.</Text>
          ) : null}
        </YStack>
      ) : null}

      <Button type="submit" theme="active" disabled={sendReset.isPending || cooldown > 0}>
        {sendReset.isPending ? "Sending..." : "Send reset email"}
      </Button>

      <Button
        type="button"
        chromeless
        alignSelf="flex-start"
        paddingHorizontal={0}
        height="auto"
        onPress={() => {
          void navigate({ to: "/auth", search: { mode: "signin", redirectTo }, replace: true });
        }}
      >
        <Text color="$blue10" textDecorationLine="underline">
          Back to sign in
        </Text>
      </Button>
    </FormRoot>
  );
}
