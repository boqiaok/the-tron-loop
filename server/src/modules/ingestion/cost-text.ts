import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
import { ImportedActivity } from './source-adapter';

export type ImportedCost = Pick<
  ImportedActivity,
  'costType' | 'costAmountFrom' | 'costDetails'
>;

/**
 * Reads website cost text such as "Free entry", "$15" or
 * "Child: $20, Adult: $15". Paid prices start from the lowest amount listed.
 */
export function parseCostText(text: string | null): ImportedCost {
  const cost = text?.replace(/\s+/g, ' ').trim().slice(0, 255) || null;
  if (!cost) {
    return {
      costType: ActivityCostType.Unknown,
      costAmountFrom: null,
      costDetails: null,
    };
  }
  if (/^free\b/i.test(cost)) {
    return {
      costType: ActivityCostType.Free,
      costAmountFrom: 0,
      costDetails: cost,
    };
  }
  const amounts = [...cost.matchAll(/\$\s*(\d+(?:\.\d{1,2})?)/g)].map((match) =>
    Number(match[1]),
  );
  return {
    costType: amounts.length ? ActivityCostType.Paid : ActivityCostType.Unknown,
    costAmountFrom: amounts.length ? Math.min(...amounts) : null,
    costDetails: cost,
  };
}
