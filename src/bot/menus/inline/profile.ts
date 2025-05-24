// src/menus/inline/exampleInlineMenu.ts
import { InlineKeyboard } from 'grammy';

const profile = new InlineKeyboard()
  .text('💰 立即充值', 'recharge')
  .text('🔄 自助续费', 'auto_renew')
  .row()
  .text('❌ 关闭', 'close')
  .text('📞 联系客服', 'contact')
  .row()
  .text('📊 订阅历史', 'subscription_history');

export default profile;
