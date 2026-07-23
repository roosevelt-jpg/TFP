"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useAction } from "next-safe-action/hooks";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { joinWaitlist } from "@/actions/join-waitlist.action";
import { CtaButton } from "@/components/brand/CtaButton";
import { Checkbox } from "@/components/brand/form/Checkbox";
import { FormField } from "@/components/brand/form/FormField";
import { FormRootError } from "@/components/brand/form/FormRootError";
import { Input } from "@/components/brand/form/Input";
import { NumberInput } from "@/components/brand/form/NumberInput";
import { OptionalDisclosure } from "@/components/brand/form/OptionalDisclosure";
import { SegmentedControl } from "@/components/brand/form/SegmentedControl";
import { TurnstileWidget } from "@/components/brand/form/TurnstileWidget";
import { WhatsAppNumberField } from "@/components/brand/form/WhatsAppNumberField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trackEvent } from "@/lib/analytics";
import { trackLead } from "@/lib/meta-pixel";
import { firstNameOf } from "@/lib/name";
import {
  DIET_OPTIONS,
  GOAL_OPTIONS,
  LEVEL_OPTIONS,
  SEX_OPTIONS,
} from "@/lib/validation/waitlist/options";
import { waitlistFormSchema } from "@/lib/validation/waitlist/schema";
import type {
  WaitlistFormInput,
  WaitlistFormOutput,
} from "@/lib/validation/waitlist/types";
import { getAttribution } from "@/lib/waitlist/attribution";

const DEFAULTS: WaitlistFormInput = {
  name: "",
  email: "",
  whatsapp: "",
  goal: "",
  level: "",
  sex: "",
  age: "",
  heightCm: "",
  weightKg: "",
  goalWeightKg: "",
  diet: "",
  injuries: "",
  consent: false,
  turnstileToken: "",
};

const DRAWER_FIELDS = [
  "goal",
  "level",
  "sex",
  "age",
  "heightCm",
  "weightKg",
  "goalWeightKg",
  "diet",
  "injuries",
] as const satisfies readonly (keyof WaitlistFormInput)[];

export function WaitlistForm({
  successHref = "/joined",
}: {
  successHref?: string;
}) {
  const router = useRouter();
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const form = useForm<WaitlistFormInput, unknown, WaitlistFormOutput>({
    resolver: zodResolver(waitlistFormSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: DEFAULTS,
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

  const nameValue = useWatch({ control, name: "name" });
  const firstName = firstNameOf(nameValue ?? "") || undefined;

  const { executeAsync, isPending, result } = useAction(joinWaitlist);

  const onInvalid = (fieldErrors: typeof errors) => {
    const firstDrawerError = DRAWER_FIELDS.find((name) => fieldErrors[name]);

    if (firstDrawerError) {
      setDrawerOpen(true);
      requestAnimationFrame(() => setFocus(firstDrawerError));
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    const toastId = toast.loading("Joining…");
    const res = await executeAsync({
      ...values,
      attribution: getAttribution(),
    });

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

      toast.error("Couldn’t submit. Please check the highlighted fields.", {
        id: toastId,
      });

      return;
    }

    toast.success("Spot reserved. Check your inbox.", { id: toastId });
    // Fired here, not on /joined pageview — that URL is shareable/refreshable.
    // isNew-gated like the server twin so a returning lead isn't recounted.
    if (res.data.isNew) {
      trackEvent("waitlist_joined", {
        ...(values.goal ? { goal: values.goal } : {}),
        ...(values.level ? { level: values.level } : {}),
      });
      // The lead's public token doubles as the CAPI dedup eventID later.
      trackLead(res.data.id);
    }
    router.push(`${successHref}?id=${encodeURIComponent(res.data.id)}`);
  }, onInvalid);

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5">
      <FormField
        label="Full name"
        htmlFor="wf-name"
        error={errors.name?.message}
      >
        {(control) => (
          <Input
            {...control}
            autoComplete="name"
            maxLength={80}
            placeholder="Kane Mousah"
            {...register("name")}
          />
        )}
      </FormField>

      <FormField
        label="Email"
        htmlFor="wf-email"
        hint="We’ll email you here when your spot opens."
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

      <FormField
        label="WhatsApp number"
        htmlFor="wf-whatsapp"
        hint="This is the number your coach will message. Need to change it later? Just email the team and we’ll switch it over."
        error={errors.whatsapp?.message}
      >
        {(control) => (
          <Controller
            control={form.control}
            name="whatsapp"
            render={({ field }) => (
              <WhatsAppNumberField
                {...control}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                previewName={firstName}
              />
            )}
          />
        )}
      </FormField>

      <OptionalDisclosure
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        summary={
          <span>
            Add your goal, stats &amp; preferences{" "}
            <span className="text-dim font-normal">(optional)</span>
          </span>
        }
      >
        <p className="text-dim text-[0.72rem] font-semibold tracking-wide uppercase">
          About you
        </p>

        <FormField
          label="Your main goal"
          htmlFor="wf-goal"
          error={errors.goal?.message}
        >
          {(control) => (
            <Controller
              control={form.control}
              name="goal"
              render={({ field }) => (
                <SegmentedControl
                  {...control}
                  name="Your main goal"
                  options={GOAL_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          )}
        </FormField>

        <FormField
          label="Experience level"
          htmlFor="wf-level"
          error={errors.level?.message}
        >
          {(control) => (
            <Controller
              control={form.control}
              name="level"
              render={({ field }) => (
                <SegmentedControl
                  {...control}
                  name="Experience level"
                  options={LEVEL_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          )}
        </FormField>

        <FormField
          label="Sex"
          htmlFor="wf-sex"
          hint="Used to set accurate calorie & macro targets."
          error={errors.sex?.message}
        >
          {(control) => (
            <Controller
              control={form.control}
              name="sex"
              render={({ field }) => (
                <SegmentedControl
                  {...control}
                  name="Sex"
                  options={SEX_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          )}
        </FormField>

        <div className="grid grid-cols-3 items-start gap-3">
          <FormField label="Age" htmlFor="wf-age" error={errors.age?.message}>
            {(control) => (
              <NumberInput
                {...control}
                maxLength={3}
                placeholder="28"
                {...register("age")}
              />
            )}
          </FormField>
          <FormField
            label="Height (cm)"
            htmlFor="wf-height"
            error={errors.heightCm?.message}
          >
            {(control) => (
              <NumberInput
                {...control}
                maxLength={3}
                placeholder="180"
                {...register("heightCm")}
              />
            )}
          </FormField>
          <FormField
            label="Weight (kg)"
            htmlFor="wf-weight"
            error={errors.weightKg?.message}
          >
            {(control) => (
              <NumberInput
                {...control}
                maxLength={3}
                placeholder="78"
                {...register("weightKg")}
              />
            )}
          </FormField>
        </div>

        <p className="text-dim mt-1 text-[0.72rem] font-semibold tracking-wide uppercase">
          Preferences
        </p>

        <FormField label="Dietary preference" htmlFor="wf-diet">
          {(control) => (
            <Controller
              control={form.control}
              name="diet"
              render={({ field }) => (
                <Select
                  value={field.value || ""}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger {...control}>
                    <SelectValue placeholder="No preference">
                      {(value: string) =>
                        DIET_OPTIONS.find((o) => o.value === value)?.label ??
                        "No preference"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {DIET_OPTIONS.map((o) => (
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
        <FormField
          label="Injuries or limitations"
          htmlFor="wf-injuries"
          hint="So your plan works around them. Leave blank if none."
          error={errors.injuries?.message}
        >
          {(control) => (
            <Input
              {...control}
              maxLength={300}
              placeholder="e.g. dodgy left shoulder, bad knees"
              {...register("injuries")}
            />
          )}
        </FormField>
        <FormField label="Goal weight (kg)" htmlFor="wf-goalweight">
          {(control) => (
            <NumberInput
              {...control}
              inputMode="decimal"
              maxLength={5}
              placeholder="Where you’re aiming"
              {...register("goalWeightKg")}
            />
          )}
        </FormField>
      </OptionalDisclosure>

      <FormField htmlFor="wf-consent" error={errors.consent?.message}>
        {(control) => (
          <Checkbox
            {...control}
            {...register("consent")}
            label={
              <>
                I confirm I am 16 or over, agree to join the waitlist and
                receive updates by email and WhatsApp, and accept the{" "}
                <Link href="/terms" className="text-text underline">
                  Terms
                </Link>{" "}
                &amp;{" "}
                <Link href="/privacy" className="text-text underline">
                  Privacy Policy
                </Link>
                .
              </>
            }
          />
        )}
      </FormField>

      <div className="grid gap-1.5">
        <TurnstileWidget
          ref={turnstileRef}
          action="join"
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
        {isPending ? "Joining…" : "Join the waitlist"}
      </CtaButton>

      <div className="text-dim flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 text-[0.77rem]">
        <span>
          <b className="text-text font-semibold">Free</b> to join today
        </span>
        <span
          aria-hidden
          className="bg-hairline-strong size-0.75 rounded-full"
        />
        <span>No payment now</span>
        <span
          aria-hidden
          className="bg-hairline-strong size-0.75 rounded-full"
        />
        <span>Early-access pricing</span>
      </div>
    </form>
  );
}
