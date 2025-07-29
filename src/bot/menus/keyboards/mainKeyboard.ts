import { Keyboard } from 'grammy';
import type { MyContext } from '../../types'; // 替换为你自己的 ctx 类型

async function createMainKeyboard(ctx: MyContext) {
  const keyboard = new Keyboard();

  // Add default buttons (与原始键一致)
  keyboard
    .text('🔋能量闪租')
    .text('💹TRX闪兑')
    .text('🆘能量预支')
    .row()
    .text('🔥笔数套餐')
    .text('👑飞机会员')
    .text('🎁积分兑换')
    .row()
    .text('💎靓号地址')
    .text('🛎地址监听')
    .text('👤个人信息')
    .row()
    .text('✈️888租用')
    .text('🤖克隆机器人')
    .text('🤝代理申请');

  // Add custom keyboard buttons from bot configuration
  if (ctx.currentBot?.keyboards && ctx.currentBot.keyboards.length > 0) {
    keyboard.row();
    ctx.currentBot.keyboards.forEach((item, index) => {
      keyboard.text(item.command);
      if (
        (index + 1) % 2 === 0 ||
        index === ctx.currentBot.keyboards.length - 1
      ) {
        keyboard.row();
      }
    });
  }

  return keyboard.resized();
}

export default createMainKeyboard;
