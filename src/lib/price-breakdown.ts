/** The listed price includes the certificate commission, without shipping. */
export function getPriceBreakdown(priceMxn: number) {
  const totalCents = Math.round(priceMxn * 100);
  const commissionCents = Math.round(totalCents * 5 / 100);
  return {
    totalMxn: totalCents / 100,
    commissionMxn: commissionCents / 100,
    artisanMxn: (totalCents - commissionCents) / 100,
    commissionPercent: 5,
    artisanPercent: 95,
    shippingMxn: 0,
  };
}