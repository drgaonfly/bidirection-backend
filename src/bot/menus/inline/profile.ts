// src/menus/inline/exampleInlineMenu.ts
import { InlineKeyboard } from 'grammy';

const profile = new InlineKeyboard()
  // .text('💰 立即充值', 'recharge:select')
  // .text('🔄 自助续费', 'auto_renew')
  // .text('📊 订阅历史', 'subscription_history')
  .text('⚡️ 我要充值', 'recharge')
  .text('📋 充值记录', 'recharge_history')
  .text('🤖 克隆机器人', 'clone_start')
  .row()
  .text('❌ 关闭', 'close')
  .text('📞 联系客服', 'contact');

export default profile;
