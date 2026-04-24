import type { FormEvent, RefObject } from "react";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@tamagui/button";
import { Input } from "@tamagui/input";
import { Text } from "@tamagui/core";
import { YStack } from "@tamagui/stacks";

import { signUpWithEmail } from "../../auth/client";
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

  const submit = form.handleSubmit(
    async (values) => {
      form.clearErrors("root");
      try {
        await signUpWithEmail({ email: values.email.trim(), password: values.password });
        announce?.announce("Account created. Redirecting.");
      } catch (err) {
        const message = mapSignUpError(err);
        form.setError("root", { message });
        formErrorRef.current?.focus();
      }
    },
    (errors) => {
      const order: (keyof SignUpValues)[] = ["email", "password"];
      const first = order.find((k) => errors[k]);
      if (first) {
        void form.setFocus(first);
      }
    },
  );

  const onFormSubmit = (event: FormEvent) => {
    event.preventDefault();
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
        Create account
      </Text>

      <Text color="$color11">Use your email and password to create a Kanban account.</Text>

      <YStack gap="$3">
        <YStack gap="$2" tag="label">
          <Text fontWeight="600" color="$color12" id="signup-email-label">
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
                  aria-labelledby="signup-email-label"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.error ? "signup-email-error" : undefined}
                  borderColor={fieldState.invalid ? "$red8" : "$borderColor"}
                />
                {fieldState.error ? (
                  <Text id="signup-email-error" color="$red10" role="alert">
                    {fieldState.error.message}
                  </Text>
                ) : null}
              </>
            )}
          />
        </YStack>

        <YStack gap="$2" tag="label">
          <Text fontWeight="600" color="$color12" id="signup-password-label">
            Password
          </Text>
          <Controller
            control={form.control}
            name="password"
            rules={{
              required: "Enter your password.",
              minLength: { value: 6, message: "Password must be at least 6 characters." },
              maxLength: { value: 128, message: "Password is too long." },
            }}
            render={({ field, fieldState }) => (
              <>
                <Input
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  secureTextEntry
                  autoComplete="new-password"
                  aria-labelledby="signup-password-label"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.error ? "signup-password-error" : undefined}
                  borderColor={fieldState.invalid ? "$red8" : "$borderColor"}
                />
                {fieldState.error ? (
                  <Text id="signup-password-error" color="$red10" role="alert">
                    {fieldState.error.message}
                  </Text>
                ) : null}
              </>
            )}
          />
        </YStack>
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

      <Button type="submit" theme="active" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? "Creating account..." : "Create account"}
      </Button>

      <Text fontSize="$2" color="$color10">
        By creating an account, you agree to the current terms and privacy policy once those pages
        are added.
      </Text>

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
          Sign in instead
        </Text>
      </Button>
    </YStack>
  );
}
