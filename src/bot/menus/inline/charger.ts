// src/menus/inline/exampleInlineMenu.ts
import { InlineKeyboard } from 'grammy';

const charger = new InlineKeyboard()
  .text('5 USDT', 'charge_5')
  .text('10 USDT', 'charge_10')
  .text('20 USDT', 'charge_20')
  .row()
  .text('50 USDT', 'charge_50')
  .text('100 USDT', 'charge_100')
  .text('300 USDT', 'charge_300')
  .row()
  .text('500 USDT', 'charge_500')
  .text('1000 USDT', 'charge_1000')
  .text('2000 USDT', 'charge_2000')
  .row()
  .text('自定义金额', 'charge_custom')
  .text('取消充值', 'charge_cancel')
  .row();

export default charger;
