"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { saveCoaching } from "@/actions/save-coaching-profile.action";
import { CtaButton } from "@/components/brand/CtaButton";
import { FormField } from "@/components/brand/form/FormField";
import { FormRootError } from "@/components/brand/form/FormRootError";
import { Input } from "@/components/brand/form/Input";
import { NumberInput } from "@/components/brand/form/NumberInput";
import { SegmentedControl } from "@/components/brand/form/SegmentedControl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  type CoachingFormInput,
  type CoachingFormOutput,
  coachingFormSchema,
} from "@/lib/validation/coaching/schema";
import {
  DIET_OPTIONS,
  GOAL_OPTIONS,
  LEVEL_OPTIONS,
  SEX_OPTIONS,
} from "@/lib/validation/waitlist/options";

// Focus order on an invalid submit, matching the rendered order.
const FIELD_ORDER = [
  "goal",
  "level",
  "sex",
  "age",
  "heightCm",
  "weightKg",
  "goalWeightKg",
  "diet",
  "injuries",
] as const satisfies readonly (keyof CoachingFormInput)[];

export function CoachingForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();

  const form = useForm<CoachingFormInput, unknown, CoachingFormOutput>({
    resolver: zodResolver(coachingFormSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      goal: "",
      level: "",
      sex: "",
      age: "",
      heightCm: "",
      weightKg: "",
      goalWeightKg: "",
      diet: "",
      injuries: "",
    },
  });
  const { control, register, formState, setFocus } = form;
  const { errors } = formState;

  const { executeAsync, isPending, result } = useAction(saveCoaching);
  const [isRefreshing, startRefresh] = useTransition();

  // The refresh re-runs the server tree, including a Stripe call, so the button
  // has to stay busy until the card actually swaps.
  const busy = isPending || isRefreshing;

  const onSubmit = form.handleSubmit(
    async (values) => {
      const toastId = toast.loading("Saving your answers…");

      const res = await executeAsync({ ...values, sessionId });

      if (res?.validationErrors || res?.serverError || !res?.data?.saved) {
        toast.error(
          res?.serverError ?? "Couldn’t save your answers. Please try again.",
          { id: toastId },
        );
        return;
      }

      toast.success("Saved. Your coach has what they need.", { id: toastId });

      // The server owns what this card shows, so refresh rather than swap in a
      // client-only success state — a reload then can't contradict it.
      startRefresh(() => router.refresh());
    },
    (invalid) => {
      // Without this a rejected field the user can't see leaves the button
      // doing nothing at all, with no toast and no explanation.
      const [first] = FIELD_ORDER.filter((field) => field in invalid);
      if (first) setFocus(first);
      toast.error("Check the highlighted answers and try again.");
    },
  );

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-5">
      <FormField
        label="Your main goal"
        htmlFor="cg-goal"
        error={errors.goal?.message}
      >
        {(field) => (
          <Controller
            control={control}
            name="goal"
            render={({ field: rhf }) => (
              <SegmentedControl
                {...field}
                name="Your main goal"
                options={GOAL_OPTIONS}
                value={rhf.value}
                onChange={rhf.onChange}
                onBlur={rhf.onBlur}
              />
            )}
          />
        )}
      </FormField>

      <FormField
        label="Experience level"
        htmlFor="cg-level"
        error={errors.level?.message}
      >
        {(field) => (
          <Controller
            control={control}
            name="level"
            render={({ field: rhf }) => (
              <SegmentedControl
                {...field}
                name="Experience level"
                options={LEVEL_OPTIONS}
                value={rhf.value}
                onChange={rhf.onChange}
                onBlur={rhf.onBlur}
              />
            )}
          />
        )}
      </FormField>

      <FormField
        label="Sex"
        htmlFor="cg-sex"
        hint="Used to set accurate calorie & macro targets."
        error={errors.sex?.message}
      >
        {(field) => (
          <Controller
            control={control}
            name="sex"
            render={({ field: rhf }) => (
              <SegmentedControl
                {...field}
                name="Sex"
                options={SEX_OPTIONS}
                value={rhf.value}
                onChange={rhf.onChange}
                onBlur={rhf.onBlur}
              />
            )}
          />
        )}
      </FormField>

      {/* Three columns leaves ~70px each at 320px, which wraps the labels and
          knocks the inputs out of line. */}
      <div className="grid grid-cols-1 items-start gap-3 min-[400px]:grid-cols-3">
        <FormField label="Age" htmlFor="cg-age" error={errors.age?.message}>
          {(field) => (
            <NumberInput
              {...field}
              maxLength={3}
              placeholder="28"
              {...register("age")}
            />
          )}
        </FormField>
        <FormField
          label="Height (cm)"
          htmlFor="cg-height"
          error={errors.heightCm?.message}
        >
          {(field) => (
            <NumberInput
              {...field}
              maxLength={3}
              placeholder="180"
              {...register("heightCm")}
            />
          )}
        </FormField>
        <FormField
          label="Weight (kg)"
          htmlFor="cg-weight"
          error={errors.weightKg?.message}
        >
          {(field) => (
            <NumberInput
              {...field}
              maxLength={3}
              placeholder="78"
              {...register("weightKg")}
            />
          )}
        </FormField>
      </div>

      <FormField
        label="Goal weight (kg)"
        htmlFor="cg-goalweight"
        error={errors.goalWeightKg?.message}
      >
        {(field) => (
          <NumberInput
            {...field}
            inputMode="decimal"
            maxLength={5}
            placeholder="Where you’re aiming"
            {...register("goalWeightKg")}
          />
        )}
      </FormField>

      <FormField
        label="Dietary preference"
        htmlFor="cg-diet"
        error={errors.diet?.message}
      >
        {(field) => (
          <Controller
            control={control}
            name="diet"
            render={({ field: rhf }) => (
              <Select value={rhf.value || ""} onValueChange={rhf.onChange}>
                <SelectTrigger {...field}>
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
        htmlFor="cg-injuries"
        hint="So your plan works around them. Leave blank if none."
        error={errors.injuries?.message}
      >
        {(field) => (
          <Input
            {...field}
            maxLength={300}
            placeholder="e.g. dodgy left shoulder, bad knees"
            {...register("injuries")}
          />
        )}
      </FormField>

      {result?.serverError && <FormRootError message={result.serverError} />}

      <CtaButton
        as="button"
        type="submit"
        size="lg"
        block
        withArrow={false}
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? (
          <span className="inline-flex items-center gap-2.5">
            <Spinner />
            Saving…
          </span>
        ) : (
          "Send This to My Coach"
        )}
      </CtaButton>
    </form>
  );
}
