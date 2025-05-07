import ejs from 'ejs';
import path from 'path';

export const useDepositSummary = () => {
  return async (data: {
    title: string;
    depositTimes: number;
    widthdrawTimes: number;
    totalDeposits: number;
    totalWidthdraws: number;
    feeRate: number;
    exchangeRate: number;
  }) => {
    const templatePath = path.join(__dirname, '../templates/summary.ejs');

    return await ejs.renderFile(templatePath, data);
  };
};
