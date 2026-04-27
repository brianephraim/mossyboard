import type { RefObject } from "react";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@tamagui/button";
import { Text } from "@tamagui/core";
import { YStack } from "@tamagui/stacks";

import { signUpWithEmail } from "../../auth/client";
import { FormRoot, FormTextField } from "../../form";
import { BoardActionButton } from "../boards/ui";
import { useAuthAnnounceOptional } from "./AuthAnnounceContext";
import { mapSignUpError } from "./firebase-auth-errors";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SignUpValues = {
  email: string;
  password: string;
};

type SignUpFormProps = Readonly<{
  redirectTo: string;
  formHeadingRef: RefObject<HTMLElement | null>;
}>;

export function SignUpForm({ redirectTo, formHeadingRef }: SignUpFormProps) {
  const navigate = useNavigate({ from: "/auth" });
  const announce = useAuthAnnounceOptional();
  const formErrorRef = useRef<HTMLDivElement>(null);
  const form = useForm<SignUpValues>({
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  });

  return (
    <FormRoot
      form={form}
      gap="$4"
      onSubmit={async (values) => {
        form.clearErrors("root");
        try {
          await signUpWithEmail({ email: values.email.trim(), password: values.password });
          announce?.announce("Account created. Redirecting.");
        } catch (err) {
          const message = mapSignUpError(err);
          form.setError("root", { message });
          formErrorRef.current?.focus();
        }
      }}
      onError={(errors) => {
        const order: (keyof SignUpValues)[] = ["email", "password"];
        const first = order.find((key) => errors[key]);
        if (first) {
          void form.setFocus(first);
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
        Create account
      </Text>

      <Text color="$boardTextMuted" lineHeight="$5">
        Create your Mossyboard login and start organizing work in a board space that stays calm and
        readable.
      </Text>

      <YStack gap="$3">
        <FormTextField<SignUpValues, "email">
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
          backgroundColor="$boardPanelSurfaceStrong"
          defaultBorderColor="$boardShellBorder"
        />

        <FormTextField<SignUpValues, "password">
          name="password"
          label="Password"
          rules={{
            required: "Enter your password.",
            minLength: { value: 6, message: "Password must be at least 6 characters." },
            maxLength: { value: 128, message: "Password is too long." },
          }}
          fieldProps={{ gap: "$2" }}
          labelProps={{ fontWeight: "600", color: "$color12" }}
          type="password"
          autoComplete="new-password"
          backgroundColor="$boardPanelSurfaceStrong"
          defaultBorderColor="$boardShellBorder"
        />
      </YStack>

      {form.formState.errors.root ? (
        <YStack
          ref={formErrorRef}
          borderWidth={1}
          borderColor="rgba(161, 64, 47, 0.18)"
          backgroundColor="$boardDangerBg"
          padding="$3"
          borderRadius="$8"
          gap="$2"
          tabIndex={-1}
        >
          <Text fontWeight="700" color="$boardDangerText">
            Could not create account
          </Text>
          <Text color="$boardDangerText">{form.formState.errors.root.message}</Text>
        </YStack>
      ) : null}

      <BoardActionButton
        width="100%"
        type="submit"
        tone="accent"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Creating account..." : "Create account"}
      </BoardActionButton>

      <Text fontSize="$2" color="$boardTextSubtle">
        Dedicated terms and privacy pages are still being added for this build.
      </Text>

      <Button
        chromeless
        alignSelf="flex-start"
        paddingHorizontal={0}
        height="auto"
        onPress={() => {
          void navigate({
            to: "/auth",
            search: { mode: "signin", redirectTo, reason: undefined },
            replace: true,
          });
        }}
      >
        <Text color="$boardAccent" textDecorationLine="underline">
          Already have an account? Sign in.
        </Text>
      </Button>
    </FormRoot>
  );
}
