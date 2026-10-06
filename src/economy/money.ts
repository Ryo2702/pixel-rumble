const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (amount: number) => usd.format(amount);
export const signedMoney = (amount: number) => `${amount >= 0 ? '+' : '−'}${money(Math.abs(amount))}`;
export const roundMoney = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
export const payoutFor = (stake: number, odds: number) => roundMoney(stake * odds);
