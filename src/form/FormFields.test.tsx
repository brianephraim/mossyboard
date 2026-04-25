import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useForm } from "react-hook-form";

import { TamaguiRootProvider } from "../tamagui/TamaguiRootProvider";
import { FormRoot } from "./FormRoot";
import { FormTextAreaField } from "./FormTextAreaField";
import { FormTextField } from "./FormTextField";

type DemoValues = {
  description: string;
  title: string;
};

function DemoForm({
  onSubmit,
}: Readonly<{
  onSubmit: (values: DemoValues) => Promise<void> | void;
}>) {
  const form = useForm<DemoValues>({
    defaultValues: {
      description: "",
      title: "",
    },
    mode: "onSubmit",
  });

  return (
    <FormRoot
      form={form}
      gap="$3"
      onSubmit={async (values) => {
        await onSubmit(values);
      }}
      onError={(errors) => {
        if (errors.title) {
          void form.setFocus("title");
        }
      }}
    >
      <FormTextField<DemoValues, "title">
        name="title"
        label="Title"
        rules={{ required: "Title is required." }}
      />
      <FormTextAreaField<DemoValues, "description"> name="description" label="Description" />
    </FormRoot>
  );
}

describe("form fields", () => {
  afterEach(() => {
    cleanup();
  });

  it("submits context-bound field values", async () => {
    const onSubmit = vi.fn(async (_values: DemoValues) => {});
    const { container } = render(
      <TamaguiRootProvider>
        <DemoForm onSubmit={onSubmit} />
      </TamaguiRootProvider>,
    );

    fireEvent.change(screen.getByLabelText(/^title$/i), { target: { value: "Roadmap" } });
    fireEvent.change(screen.getByLabelText(/^description$/i), {
      target: { value: "Scope the Q3 work" },
    });

    const formElement = container.querySelector("form");
    if (!(formElement instanceof HTMLFormElement)) {
      throw new Error("Expected demo form element");
    }

    fireEvent.submit(formElement);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      description: "Scope the Q3 work",
      title: "Roadmap",
    });
  });

  it("forwards refs so setFocus can target the invalid field", async () => {
    const onSubmit = vi.fn(async (_values: DemoValues) => {});
    const { container } = render(
      <TamaguiRootProvider>
        <DemoForm onSubmit={onSubmit} />
      </TamaguiRootProvider>,
    );

    const formElement = container.querySelector("form");
    if (!(formElement instanceof HTMLFormElement)) {
      throw new Error("Expected demo form element");
    }

    fireEvent.submit(formElement);

    expect(await screen.findByText("Title is required.")).toBeTruthy();
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByLabelText(/^title$/i));
    });
  });
});
