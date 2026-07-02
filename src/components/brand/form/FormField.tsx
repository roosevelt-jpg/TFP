type FormFieldProps = {
  label: React.ReactNode;
  htmlFor: string;
  hint?: React.ReactNode;
  optional?: boolean;
  error?: string;
  children: React.ReactNode;
};

export function FormField({
  label,
  htmlFor,
  hint,
  optional,
  error,
  children,
}: FormFieldProps) {
  return (
    <div className="grid gap-2">
      {label ? (
        <label
          htmlFor={htmlFor}
          className="flex items-baseline justify-between text-[0.85rem] font-medium"
        >
          <span>{label}</span>
          {optional && (
            <span className="text-dim text-[0.75rem]">Optional</span>
          )}
        </label>
      ) : null}
      {children}
      {hint && !error && (
        <p
          id={`${htmlFor}-hint`}
          className="text-dim text-[0.78rem] leading-normal"
        >
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="text-red text-[0.78rem] leading-normal"
        >
          {error}
        </p>
      )}
    </div>
  );
}
