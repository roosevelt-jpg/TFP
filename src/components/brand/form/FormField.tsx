type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

type FormFieldProps = {
  label?: React.ReactNode;
  htmlFor: string;
  hint?: React.ReactNode;
  optional?: boolean;
  error?: string;
  children: (control: FieldControlProps) => React.ReactNode;
};

export function FormField({
  label,
  htmlFor,
  hint,
  optional,
  error,
  children,
}: FormFieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  const describedBy = [error ? undefined : hintId, errorId]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="grid gap-2">
      {label ? (
        <label
          htmlFor={htmlFor}
          className="text-muted flex items-baseline justify-between text-[0.8rem] font-semibold"
        >
          <span>{label}</span>
          {optional && (
            <span className="text-dim text-[0.75rem]">Optional</span>
          )}
        </label>
      ) : null}
      {children({
        id: htmlFor,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && !error && (
        <p id={hintId} className="text-dim text-[0.78rem] leading-normal">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-danger text-[0.78rem] leading-normal"
        >
          {error}
        </p>
      )}
    </div>
  );
}
