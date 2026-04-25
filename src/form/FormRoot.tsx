import type { ComponentProps, FormEvent, ReactNode } from "react";
import {
  FormProvider,
  type FieldValues,
  type SubmitErrorHandler,
  type SubmitHandler,
  type UseFormReturn,
} from "react-hook-form";
import { YStack } from "@tamagui/stacks";

type FormRootProps<TFieldValues extends FieldValues> = Readonly<{
  children: ReactNode;
  form: UseFormReturn<TFieldValues>;
  id?: string;
  onError?: SubmitErrorHandler<TFieldValues>;
  onSubmit: SubmitHandler<TFieldValues>;
}> &
  Omit<ComponentProps<typeof YStack>, "children" | "onSubmit" | "tag">;

export function FormRoot<TFieldValues extends FieldValues>({
  children,
  form,
  id,
  onError,
  onSubmit,
  ...stackProps
}: FormRootProps<TFieldValues>) {
  const handleSubmit = form.handleSubmit(onSubmit, onError);

  return (
    <FormProvider {...form}>
      <form
        id={id}
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          void handleSubmit(event);
        }}
      >
        <YStack {...stackProps}>{children}</YStack>
      </form>
    </FormProvider>
  );
}
