import { describe, expect, it } from 'vitest';
import { getPriceBreakdown } from '@/lib/price-breakdown';

describe('inclusive craft price breakdown', () => {
  it('allocates 5% to the platform certificate', () => {
    expect(getPriceBreakdown(450).commissionMxn).toBe(22.5);
    expect(getPriceBreakdown(1850).commissionMxn).toBe(92.5);
    expect(getPriceBreakdown(450).commissionPercent).toBe(5);
  });
  it('allocates 95% to the artisan without increasing the listed price', () => {
    const price = getPriceBreakdown(450);
    expect(price.artisanMxn).toBe(427.5);
    expect(price.artisanPercent).toBe(95);
    expect(price.totalMxn).toBe(450);
    expect(price.artisanMxn + price.commissionMxn).toBe(450);
  });
  it('excludes shipping for now', () => {
    expect(getPriceBreakdown(3200).shippingMxn).toBe(0);
    expect(getPriceBreakdown(3200).totalMxn).toBe(3200);
  });
});