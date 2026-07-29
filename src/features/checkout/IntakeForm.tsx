"use client";

import Link from "next/link";
import { useRef } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { useAction } from "next-safe-action/hooks";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { createCheckoutSession } from "@/actions/create-checkout-session.action";
import { CtaButton } from "@/components/brand/CtaButton";
import { Checkbox } from "@/components/brand/form/Checkbox";
import { FormField } from "@/components/brand/form/FormField";
import { FormRootError } from "@/components/brand/form/FormRootError";
import { Input } from "@/components/brand/form/Input";
import { TurnstileWidget } from "@/components/brand/form/TurnstileWidget";
import { WhatsAppNumberField } from "@/components/brand/form/WhatsAppNumberField";
import { SecureBadge } from "@/components/brand/SecureBadge";
import { Spinner } from "@/components/ui/spinner";
import { trackEvent } from "@/lib/analytics";
import { firstNameOf } from "@/lib/name";
import { ROLLOVER_DISCLOSURE } from "@/lib/pricing";
import {
  type CheckoutFormInput,
  type CheckoutFormOutput,
  checkoutFormSchema,
} from "@/lib/validation/checkout/schema";
import { getAttribution } from "@/lib/waitlist/attribution";

export type IntakePrefill = {
  name?: string;
  email?: string;
  whatsapp?: string;
};

export function IntakeForm({
  waitlistToken,
  prefill,
}: {
  waitlistToken?: string;
  prefill?: IntakePrefill;
}) {
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);
  const serverErrorRef = useRef<HTMLDivElement>(null);

  const form = useForm<CheckoutFormInput, unknown, CheckoutFormOutput>({
    resolver: zodResolver(checkoutFormSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      name: prefill?.name ?? "",
      email: prefill?.email ?? "",
      whatsapp: prefill?.whatsapp ?? "",
      consent: false,
      promoCode: "",
      turnstileToken: "",
    },
  });
  const { control, register, formState, setError, setFocus, setValue } = form;
  const { errors } = formState;

  const nameValue = useWatch({ control, name: "name" });
  const firstName = firstNameOf(nameValue ?? "") || undefined;

  const { executeAsync, isPending, result } = useAction(createCheckoutSession);

  const onSubmit = form.handleSubmit(async (values) => {
    const toastId = toast.loading("Taking you to secure checkout…");

    const res = await executeAsync({
      ...values,
      attribution: getAttribution(),
      ...(waitlistToken ? { waitlistToken } : {}),
    });

    const whatsappError = res?.validationErrors?.whatsapp?._errors?.[0];
    if (whatsappError) {
      setError("whatsapp", { message: whatsappError });
      setFocus("whatsapp");
    }

    // Only the server can tell a real code from a plausible one, so its verdict
    // has to land on the field rather than in a toast that dismisses itself.
    const promoError = res?.validationErrors?.promoCode?._errors?.[0];
    if (promoError) {
      setError("promoCode", { message: promoError });
      setFocus("promoCode");
    }

    const turnstileError = res?.validationErrors?.turnstileToken?._errors?.[0];
    if (turnstileError) setError("turnstileToken", { message: turnstileError });

    if (res?.validationErrors || res?.serverError || !res?.data?.url) {
      // Consumed server-side, so a retry needs a fresh challenge.
      turnstileRef.current?.reset();
      setValue("turnstileToken", "");

      toast.error(
        res?.serverError ?? "Couldn’t start checkout. Check the fields above.",
        { id: toastId },
      );

      // The banner renders below the fold on a short viewport, and a toast
      // alone dismisses before it's been read.
      if (res?.serverError) {
        requestAnimationFrame(() =>
          serverErrorRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          }),
        );
      }
      return;
    }

    trackEvent("checkout_started");

    // Full navigation, not router.push: Stripe is a different origin. The toast
    // and pending state stay up until the browser leaves.
    window.location.assign(res.data.url);
  });

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5">
      <FormField
        label="Full name"
        htmlFor="cf-name"
        error={errors.name?.message}
      >
        {(field) => (
          <Input
            {...field}
            autoComplete="name"
            maxLength={80}
            placeholder="Kane Mousah"
            {...register("name")}
          />
        )}
      </FormField>

      <FormField
        label="Email"
        htmlFor="cf-email"
        hint="Your receipt and programme go here."
        error={errors.email?.message}
      >
        {(field) => (
          <Input
            {...field}
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
        htmlFor="cf-whatsapp"
        hint="This is the number your coach will message."
        error={errors.whatsapp?.message}
      >
        {(field) => (
          <Controller
            control={control}
            name="whatsapp"
            render={({ field: rhf }) => (
              <WhatsAppNumberField
                {...field}
                value={rhf.value}
                onChange={rhf.onChange}
                onBlur={rhf.onBlur}
                previewName={firstName}
                previewSuffix="as soon as you’re in"
              />
            )}
          />
        )}
      </FormField>

      {/* Here rather than on Stripe's page: theirs is a collapsed "Add
          promotion code" link that buyers were missing entirely. */}
      <FormField
        label="Promo code"
        htmlFor="cf-promo"
        optional
        hint="If you were sent one, enter it here and we’ll apply it."
        error={errors.promoCode?.message}
      >
        {(field) => (
          <Input
            {...field}
            {...register("promoCode")}
            placeholder="FORMULA50"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
          />
        )}
      </FormField>

      <FormField htmlFor="cf-consent" error={errors.consent?.message}>
        {(field) => (
          <Checkbox
            {...field}
            {...register("consent")}
            label={
              <>
                I confirm I am 16 or over, agree to The Formula using these
                details to coach me by WhatsApp, and accept the{" "}
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

      <TurnstileWidget
        ref={turnstileRef}
        action="checkout"
        onToken={(token) => setValue("turnstileToken", token ?? "")}
      />
      {errors.turnstileToken?.message && (
        <FormRootError message={errors.turnstileToken.message} />
      )}

      {result?.serverError && (
        <div ref={serverErrorRef} className="grid gap-2">
          <FormRootError message={result.serverError} />
          <Link
            href="/support"
            className="text-text justify-self-start text-[0.85rem] underline"
          >
            Talk to the team
          </Link>
        </div>
      )}

      <div className="grid gap-1.5">
        <p className="text-muted text-[0.85rem] leading-[1.6]">
          {ROLLOVER_DISCLOSURE}
        </p>

        <CtaButton
          as="button"
          type="submit"
          size="lg"
          block
          withArrow={false}
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? (
            <span className="inline-flex items-center gap-2.5">
              <Spinner />
              Taking you to checkout…
            </span>
          ) : (
            "Continue to Secure Payment"
          )}
        </CtaButton>

        <div className="text-dim mt-1 flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[0.8rem]">
          <SecureBadge label="Secure Stripe checkout" />
        </div>
      </div>
    </form>
  );
}
