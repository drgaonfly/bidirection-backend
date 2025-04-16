export const formatUSDT = (amount: number): number => {
  return Number(amount.toFixed(3));
};

export const formatETH = (amount: number): number => {
  return Number(amount.toFixed(5));
};
