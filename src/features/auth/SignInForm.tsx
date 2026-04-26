import type { RefObject } from "react";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@tamagui/button";
import { Text } from "@tamagui/core";
import { YStack } from "@tamagui/stacks";

import { signInWithEmail } from "../../auth/client";
import { FormRoot, FormTextField } from "../../form";
import { useAuthAnnounceOptional } from "./AuthAnnounceContext";
import { mapSignInError } from "./firebase-auth-errors";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SignInValues = {
  email: string;
  password: string;
};

type SignInFormProps = Readonly<{
  redirectTo: string;
  formHeadingRef: RefObject<HTMLElement | null>;
}>;

export function SignInForm({ redirectTo, formHeadingRef }: SignInFormProps) {
  const navigate = useNavigate({ from: "/auth" });
  const announce = useAuthAnnounceOptional();
  const formErrorRef = useRef<HTMLDivElement>(null);
  const form = useForm<SignInValues>({
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
          await signInWithEmail({ email: values.email.trim(), password: values.password });
          announce?.announce("Signed in. Redirecting.");
        } catch (err) {
          const message = mapSignInError(err);
          form.setError("root", { message });
          formErrorRef.current?.focus();
        }
      }}
      onError={(errors) => {
        const order: (keyof SignInValues)[] = ["email", "password"];
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
        Sign in
      </Text>

      <YStack gap="$3">
        <FormTextField<SignInValues, "email">
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

        <FormTextField<SignInValues, "password">
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
          autoComplete="current-password"
          defaultBorderColor="$borderColor"
        />
      </YStack>

      {form.formState.errors.root ? (
        <YStack
          ref={formErrorRef}
          tabIndex={-1}
          borderWidth={1}
          borderColor="$red8"
          backgroundColor="$red2"
          padding="$3"
          borderRadius="$4"
          gap="$2"
        >
          <Text fontWeight="700" color="$red11">
            Sign-in failed
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
        {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
      </Button>

      <YStack gap="$2">
        <Button
          chromeless
          alignSelf="flex-start"
          paddingHorizontal={0}
          height="auto"
          onPress={() => {
            const email = form.getValues("email");
            void navigate({
              to: "/auth",
              search: { mode: "reset", redirectTo, reason: undefined },
              state: (prev) => ({ ...(prev ?? {}), prefillEmail: email }),
            });
          }}
        >
          <Text color="$blue10" textDecorationLine="underline">
            Forgot password?
          </Text>
        </Button>
        <Button
          chromeless
          alignSelf="flex-start"
          paddingHorizontal={0}
          height="auto"
          onPress={() => {
            void navigate({
              to: "/auth",
              search: { mode: "signup", redirectTo, reason: undefined },
              replace: true,
            });
          }}
        >
          <Text color="$blue10" textDecorationLine="underline">
            Create account
          </Text>
        </Button>
      </YStack>
    </FormRoot>
  );
}
