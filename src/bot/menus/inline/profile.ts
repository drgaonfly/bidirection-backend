// src/menus/inline/exampleInlineMenu.ts
import { InlineKeyboard } from 'grammy';
import { IBot } from '../../../models/bot';

const createProfile = (bot: IBot) => {
  return (
    new InlineKeyboard()
      // .text('💰 立即充值', 'recharge:select')
      // .text('🔄 自助续费', 'auto_renew')
      // .text('📊 订阅历史', 'subscription_history')
      .text('⚡️ 我要充值', 'recharge')
      .text('📋 充值记录', 'recharge_history')
      .row()
      .text('📝 我的笔数套餐', 'my_packageOrder')
      .url('📞 联系客服', bot.customer_service_link || 'https://t.me/Net_8898')
      .row()
      .text('❌ 关闭', 'close')
  );
};

export default createProfile;
