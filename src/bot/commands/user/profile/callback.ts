// src/composers/callback.ts
import { CallbackQueryContext, Composer } from 'grammy';
import createDebug from 'debug';
import { MyContext } from '../../../types';
import charger from '../../../menus/inline/charger';
const debug = createDebug('bot:subscription:callback');

// 创建一个 Composer 实例
const callbackComposer = new Composer<MyContext>();

// 处理“重新选择套餐”按钮点击
callbackComposer.callbackQuery(
  'recharge:select',
  async (ctx: CallbackQueryContext<MyContext>) => {
    debug('recharge:select');
    await ctx.reply('💰请选择下面充值订单金额\n📈请严格按照小数点转账❗️❗️', {
      reply_markup: charger,
    });

    // 可选：确认回调（防止客户端加载动画）
    await ctx.answerCallbackQuery();
  },
);

// 处理“自定义充值金额”按钮点击
callbackComposer.callbackQuery(
  'charge_custom',
  async (ctx: CallbackQueryContext<MyContext>) => {
    debug('charge_custom');
    debug(ctx.awaitingCustomCharge);
    await ctx.reply(
      '请输入您想要充值的金额（单位：元）：\n\n⚠️ 请确保输入格式正确，例如：10.00\n\n如需取消，请发送“取消”或点击下方按钮。',
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '❌ 取消',
                callback_data: 'charge_cancel',
              },
            ],
          ],
        },
      },
    );
    // 可选：确认回调（防止客户端加载动画）
    await ctx.answerCallbackQuery();
    // 设置会话状态，等待用户输入自定义金额
    ctx.awaitingCustomCharge = true;
  },
);

// 处理“自定义充值金额取消”按钮点击
callbackComposer.callbackQuery(
  'charge_cancel',
  async (ctx: CallbackQueryContext<MyContext>) => {
    debug('charge_cancel');
    ctx.awaitingCustomCharge = false;
    // 删除原消息，不回复文本
    if (ctx.callbackQuery.message) {
      await ctx.deleteMessage();
    }
    await ctx.answerCallbackQuery({ text: '已取消' });
  },
);

export default callbackComposer;
