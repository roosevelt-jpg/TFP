// JS mirror of the --ease-out CSS token for Motion, which needs a
// cubic-bezier array rather than a CSS custom property.
export const easeOut = [0.2, 0.7, 0.2, 1] as const;

// JS mirror of --ease-fill (ease-out-cubic) for the progress-bar fill.
export const easeFill = [0.33, 1, 0.68, 1] as const;
