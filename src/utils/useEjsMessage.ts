import ejs from 'ejs';
import path from 'path';

export const useSummary = () => {
  return async (data: {
    title: string;
    depositTimes: number;
    widthdrawTimes: number;
    deposits: any[];
    widthdraws: any[];
    feeRate: number;
    exchangeRate: number;
    unit?: string;
  }) => {
    const templatePath = path.join(__dirname, '../templates/summary.ejs');

    return await ejs.renderFile(templatePath, data);
  };
};

export const useDeposit = () => {
  return async (data: {
    title: string;
    depositTimes: number;
    deposits: any[];
    feeRate: number;
    exchangeRate: number;
    unit?: string;
  }) => {
    const templatePath = path.join(__dirname, '../templates/deposit.ejs');
    return await ejs.renderFile(templatePath, data);
  };
};

export const useWithdraw = () => {
  return async (data: {
    title: string;
    widthdrawTimes: number;
    widthdraws: any[];
    feeRate: number;
    exchangeRate: number;
    unit?: string;
  }) => {
    const templatePath = path.join(__dirname, '../templates/withdraw.ejs');
    return await ejs.renderFile(templatePath, data);
  };
};
