import type { FormEvent, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@tamagui/button";
import { Input } from "@tamagui/input";
import { Text } from "@tamagui/core";
import { YStack } from "@tamagui/stacks";

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

  const submit = form.handleSubmit(
    async (values) => {
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
    },
    (errors) => {
      if (errors.email) {
        void form.setFocus("email");
      }
    },
  );

  const onFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (cooldown > 0) {
      return;
    }

    void submit();
  };

  return (
    <YStack tag="form" gap="$4" onSubmit={onFormSubmit}>
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

      <YStack gap="$2" tag="label">
        <Text fontWeight="600" color="$color12" id="reset-email-label">
          Email
        </Text>
        <Controller
          control={form.control}
          name="email"
          rules={{
            required: "Enter your email.",
            maxLength: { value: 320, message: "Email is too long." },
            validate: (v) => {
              const t = v.trim();
              if (!t) {
                return "Enter your email.";
              }

              if (!emailPattern.test(t)) {
                return "Enter a valid email address.";
              }

              return true;
            },
          }}
          render={({ field, fieldState }) => (
            <>
              <Input
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                aria-labelledby="reset-email-label"
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.error
                    ? "reset-email-error"
                    : sendSucceeded
                      ? "reset-success"
                      : undefined
                }
                borderColor={fieldState.invalid ? "$red8" : "$borderColor"}
              />
              {fieldState.error ? (
                <Text id="reset-email-error" color="$red10" role="alert">
                  {fieldState.error.message}
                </Text>
              ) : null}
            </>
          )}
        />
      </YStack>

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
    </YStack>
  );
}
