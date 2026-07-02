type Option = { value: string; label: string };

export const GOAL_OPTIONS = [
  { value: "lose", label: "Lose fat" },
  { value: "build", label: "Build muscle" },
  { value: "fit", label: "Get fit" },
] as const satisfies readonly Option[];

export const LEVEL_OPTIONS = [
  { value: "beg", label: "Beginner" },
  { value: "int", label: "Intermediate" },
  { value: "adv", label: "Advanced" },
] as const satisfies readonly Option[];

export const SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const satisfies readonly Option[];

export const DIET_OPTIONS = [
  { value: "none", label: "No preference" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "halal", label: "Halal" },
  { value: "other", label: "Other" },
] as const satisfies readonly Option[];

export const GOAL_VALUES = ["lose", "build", "fit"] as const;
export const LEVEL_VALUES = ["beg", "int", "adv"] as const;
export const SEX_VALUES = ["male", "female", "other"] as const;
export const DIET_VALUES = [
  "none",
  "vegetarian",
  "vegan",
  "pescatarian",
  "halal",
  "other",
] as const;

export type GoalValue = (typeof GOAL_VALUES)[number];
export type LevelValue = (typeof LEVEL_VALUES)[number];
export type SexValue = (typeof SEX_VALUES)[number];
export type DietValue = (typeof DIET_VALUES)[number];
