import BigNumber from 'bignumber.js';

export const formatUSDT = (amount: number): string => {
  return new BigNumber(amount).decimalPlaces(3).toString();
};

export const formatETH = (amount: number): string => {
  return new BigNumber(amount).decimalPlaces(6).toString();
};
