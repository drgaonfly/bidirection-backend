import { Keyboard } from 'grammy';

const mainKeyboard = new Keyboard()
  .text('🎁 申请试用')
  .text('💰 自助续费')
  .row()
  .text('💬 联系客服')
  .text('👤 个人信息')
  .text('▶️ 开始使用')
  .resized();

export default mainKeyboard;
