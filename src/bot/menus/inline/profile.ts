// src/menus/inline/exampleInlineMenu.ts
import { InlineKeyboard } from 'grammy';

const createProfile = () => {
  return (
    new InlineKeyboard()
      // .text('💰 立即充值', 'recharge:select')
      // .text('🔄 自助续费', 'auto_renew')
      // .text('📊 订阅历史', 'subscription_history')
      .text('⚡️ 我要充值', 'recharge')
      .text('📋 充值记录', 'recharge_history')
      .row()
      // .url('📞 联系客服', bot.contact || 'https://t.me/Net_8898')
      .row()
      .text('❌ 关闭', 'close')
  );
};

export default createProfile;
