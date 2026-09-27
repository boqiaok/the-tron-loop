import { ActivityCostType } from '../activities/enums/activity-cost-type.enum';
import { parseCostText } from './cost-text';

describe('parseCostText', () => {
  it.each([
    ['Free entry', ActivityCostType.Free, 0],
    ['Free with registration', ActivityCostType.Free, 0],
    ['$55 per day', ActivityCostType.Paid, 55],
    ['Child: $20 | Adult: $15 | Family: $60', ActivityCostType.Paid, 15],
    ['Koha appreciated', ActivityCostType.Unknown, null],
    [null, ActivityCostType.Unknown, null],
  ])('reads "%s"', (text, costType, costAmountFrom) => {
    expect(parseCostText(text)).toMatchObject({ costType, costAmountFrom });
  });
});
