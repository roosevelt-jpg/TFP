"use client";

import { useRef } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useAction } from "next-safe-action/hooks";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { submitSupport } from "@/actions/submit-support.action";
import { CtaButton } from "@/components/brand/CtaButton";
import { FormField } from "@/components/brand/form/FormField";
import { FormRootError } from "@/components/brand/form/FormRootError";
import { Input } from "@/components/brand/form/Input";
import { Textarea } from "@/components/brand/form/Textarea";
import { TurnstileWidget } from "@/components/brand/form/TurnstileWidget";
import { WhatsAppNumberField } from "@/components/brand/form/WhatsAppNumberField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { firstNameOf } from "@/lib/name";
import {
  type SupportOption,
  type SupportType,
  TIMING_NOTE_TYPES,
} from "@/lib/validation/support/options";
import {
  type SupportFormValues,
  supportSchema,
} from "@/lib/validation/support/schema";
import { siteConfig } from "@/config/site";
import { SupportSuccess } from "@/features/support/SupportSuccess";

export function SupportForm({
  defaultType = "general",
  options,
  paymentsLive,
}: {
  defaultType?: SupportType;
  options: readonly SupportOption[];
  paymentsLive: boolean;
}) {
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);

  const form = useForm<SupportFormValues>({
    resolver: zodResolver(supportSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      type: defaultType,
      whatsapp: "",
      message: "",
      turnstileToken: "",
    },
  });
  const {
    control,
    register,
    formState,
    setError,
    setFocus,
    setValue,
    handleSubmit,
  } = form;

  const { errors } = formState;

  const type = useWatch({ control, name: "type" });
  const nameValue = useWatch({ control, name: "name" });
  const firstName = firstNameOf(nameValue ?? "") || undefined;
  const needsWa = type === "wa";
  const showTiming = paymentsLive && TIMING_NOTE_TYPES.has(type);

  const { executeAsync, isPending, result, hasSucceeded, reset } =
    useAction(submitSupport);

  const onSubmit = handleSubmit(async (values) => {
    const toastId = toast.loading("Sending…");
    const res = await executeAsync(values);

    const whatsappError = res?.validationErrors?.whatsapp?._errors?.[0];

    if (whatsappError) {
      setError("whatsapp", { message: whatsappError });
      setFocus("whatsapp");
    }

    const turnstileError = res?.validationErrors?.turnstileToken?._errors?.[0];

    if (turnstileError) setError("turnstileToken", { message: turnstileError });

    if (res?.validationErrors || res?.serverError || !res?.data) {
      // The token was consumed server-side; reset for a fresh challenge on retry.
      turnstileRef.current?.reset();

      setValue("turnstileToken", "");

      toast.error("Couldn’t send. Please check the highlighted fields.", {
        id: toastId,
      });

      return;
    }

    toast.success("Request received. We’ll be in touch.", { id: toastId });
  });

  if (hasSucceeded && result.data) {
    return (
      <SupportSuccess
        name={result.data.firstName}
        email={result.data.email}
        typeLabel={result.data.typeLabel}
        isCancel={result.data.isCancel}
        onReset={() => {
          reset();
          form.reset();
        }}
      />
    );
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="bg-bg border-hairline shadow-card mt-[30px] grid gap-[18px] rounded-md border p-[clamp(22px,4vw,32px)]"
    >
      <FormField
        label="Full name"
        htmlFor="s-name"
        error={errors.name?.message}
      >
        {(control) => (
          <Input
            {...control}
            autoComplete="name"
            maxLength={80}
            placeholder="Your name"
            {...register("name")}
          />
        )}
      </FormField>

      <FormField
        label={paymentsLive ? "Email on your account" : "Your email"}
        htmlFor="s-email"
        hint="Use the email you signed up with so we can match your request."
        error={errors.email?.message}
      >
        {(control) => (
          <Input
            {...control}
            type="email"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            maxLength={120}
            placeholder="you@email.com"
            {...register("email")}
          />
        )}
      </FormField>

      <FormField label="What do you need?" htmlFor="s-type">
        {(control) => (
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger {...control} aria-label="What do you need?">
                  <SelectValue>
                    {(value: string) =>
                      options.find((o) => o.value === value)?.label ?? ""
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </FormField>

      {needsWa && (
        <FormField
          label="New WhatsApp number"
          htmlFor="s-wa"
          hint="We’ll move your coach over to this number once we’ve confirmed it’s you."
          error={errors.whatsapp?.message}
        >
          {(control) => (
            <Controller
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <WhatsAppNumberField
                  {...control}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  previewName={firstName}
                />
              )}
            />
          )}
        </FormField>
      )}

      {showTiming && (
        <div
          role="status"
          className="border-hairline rounded-xs border px-4 py-3.5"
        >
          <p className="text-muted text-[0.84rem] leading-[1.55]">
            <b className="text-text font-semibold">Heads up on timing.</b> If
            you’re within <b className="text-text font-semibold">1 day</b> of
            your next payment, we may not be able to stop it in time, as payment
            processing is scheduled in advance. If that next charge does go
            through, it simply covers your final month and your coach stays
            active until it ends.
          </p>
        </div>
      )}

      <FormField
        label={
          <>
            Message <span className="text-dim font-normal">(optional)</span>
          </>
        }
        htmlFor="s-msg"
        error={errors.message?.message}
      >
        {(control) => (
          <Textarea
            {...control}
            maxLength={2000}
            placeholder="Anything that helps us sort this faster…"
            {...register("message")}
          />
        )}
      </FormField>

      <div className="grid gap-1.5">
        <TurnstileWidget
          ref={turnstileRef}
          action="support"
          onToken={(token) =>
            setValue("turnstileToken", token ?? "", { shouldValidate: false })
          }
        />
        {errors.turnstileToken?.message && (
          <p className="text-red text-[0.82rem]">
            {errors.turnstileToken.message}
          </p>
        )}
      </div>

      {result?.serverError && <FormRootError message={result.serverError} />}

      <CtaButton
        as="button"
        type="submit"
        size="lg"
        block
        withArrow={false}
        disabled={isPending}
      >
        {isPending ? "Sending…" : "Send request"}
      </CtaButton>

      <p className="text-dim text-center text-[0.77rem]">
        Prefer email? Reach us at{" "}
        <a
          href={`mailto:${siteConfig.contactEmail}`}
          className="text-text underline"
        >
          {siteConfig.contactEmail}
        </a>
      </p>
    </form>
  );
}
