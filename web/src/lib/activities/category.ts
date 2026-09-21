import type { ActivityCategory } from "@/types/activity";

export interface CategoryInfo {
  value: ActivityCategory;
  label: string;
  shortLabel: string;
  color: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { value: "market", label: "Market", shortLabel: "Market", color: "#D97706" },
  {
    value: "workshop",
    label: "Workshop",
    shortLabel: "Workshop",
    color: "#7C3AED",
  },
  { value: "family", label: "Family", shortLabel: "Family", color: "#DB2777" },
  {
    value: "outdoors",
    label: "Outdoors",
    shortLabel: "Outdoors",
    color: "#0F7A4E",
  },
  {
    value: "arts_music",
    label: "Arts & music",
    shortLabel: "Arts",
    color: "#0EA5B7",
  },
  {
    value: "community",
    label: "Community",
    shortLabel: "Community",
    color: "#6366F1",
  },
];

const CATEGORY_BY_VALUE = new Map(
  CATEGORIES.map((category) => [category.value, category]),
);

export function getCategory(value: ActivityCategory): CategoryInfo {
  return CATEGORY_BY_VALUE.get(value) ?? CATEGORIES[CATEGORIES.length - 1];
}

export function isActivityCategory(value: string): value is ActivityCategory {
  return CATEGORY_BY_VALUE.has(value as ActivityCategory);
}
