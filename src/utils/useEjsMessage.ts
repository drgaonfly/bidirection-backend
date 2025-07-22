import ejs from 'ejs';
import path from 'path';
import { IBotUserConfig } from '../models/botUserConfig';
import { IBot } from '../models/bot';

export const useSummary = () => {
  return async (data: {
    deposits: any[];
    withdraws: any[];
    feeRate: number;
    summary: number;
    exchangeRate: number;
    unit?: string;
  }) => {
    const templatePath = path.join(__dirname, '../templates/summary.ejs');

    return await ejs.renderFile(templatePath, data);
  };
};

export const useCustomerService = () => {
  return async (data: { url: string; channel: string; group: string }) => {
    const templatePath = path.join(
      __dirname,
      '../templates/customerService.ejs',
    );
    return await ejs.renderFile(templatePath, data);
  };
};

// 创建用户资料模板渲染函数
export const useUserProfile = () => {
  return async (data: {
    userId: string;
    userName: string;
    nickname: string;
    registerDate: string;
    currentBalance: number;
    botUserConfig: IBotUserConfig;
    currentPlan: string;
    bot: IBot;
    usdt_balance: number;
    trx_balance: number;
  }) => {
    const templatePath = path.join(__dirname, '../templates/userProfile.ejs');
    return await ejs.renderFile(templatePath, data);
  };
};

export const useRenewal = () => {
  return async () => {
    const templatePath = path.join(__dirname, '../templates/renewal.ejs');
    return await ejs.renderFile(templatePath);
  };
};

export const useSubscriptionHistory = () => {
  return async (data: { subscriptions: any[] }) => {
    const templatePath = path.join(
      __dirname,
      '../templates/subscriptionHistory.ejs',
    );
    return await ejs.renderFile(templatePath, data);
  };
};

export const useOrderHistory = () => {
  return async (data: {
    type: string;
    orders: Array<any>;
    t: (key: string) => string;
  }) => {
    const templatePath = path.join(__dirname, '../templates/orderHistory.ejs');
    return await ejs.renderFile(templatePath, data);
  };
};

export const useBuyStars = () => {
  return async (data: { membershipName: string; price: number }) => {
    const templatePath = path.join(__dirname, '../templates/buyStars.ejs');
    return await ejs.renderFile(templatePath, data);
  };
};
