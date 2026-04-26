import type { RefObject } from "react";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@tamagui/button";
import { Text } from "@tamagui/core";
import { YStack } from "@tamagui/stacks";

import { signUpWithEmail } from "../../auth/client";
import { FormRoot, FormTextField } from "../../form";
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

      <Text color="$color11">Use your email and password to create a Kanban account.</Text>

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
          defaultBorderColor="$borderColor"
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
          defaultBorderColor="$borderColor"
        />
      </YStack>

      {form.formState.errors.root ? (
        <YStack
          ref={formErrorRef}
          borderWidth={1}
          borderColor="$red8"
          backgroundColor="$red2"
          padding="$3"
          borderRadius="$4"
          gap="$2"
          tabIndex={-1}
        >
          <Text fontWeight="700" color="$red11">
            Could not create account
          </Text>
          <Text color="$red11">{form.formState.errors.root.message}</Text>
        </YStack>
      ) : null}

      <Button
        disabled={form.formState.isSubmitting}
        backgroundColor="$blue10"
        pressStyle={{ backgroundColor: "$blue11" }}
        color="$color1"
      >
        {form.formState.isSubmitting ? "Creating account..." : "Create account"}
      </Button>

      <Text fontSize="$2" color="$color10">
        By creating an account, you agree to the current terms and privacy policy once those pages
        are added.
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
        <Text color="$blue10" textDecorationLine="underline">
          Sign in instead
        </Text>
      </Button>
    </FormRoot>
  );
}
