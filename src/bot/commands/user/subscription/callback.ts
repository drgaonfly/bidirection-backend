// src/composers/callback.ts
import { CallbackQueryContext, Composer } from 'grammy';
import createDebug from 'debug';
import { handleRenewalMessage } from './renewal';
import { MyContext } from '../../../types';
import Payment from '../../../../models/payment';

const debug = createDebug('bot:subscription:callback');

// 创建一个 Composer 实例
const callbackComposer = new Composer();

callbackComposer.callbackQuery(
  'auto_renew',
  async (ctx: CallbackQueryContext<MyContext>) => {
    const data = ctx.callbackQuery?.data;

    debug(`用户点击了按钮: ${data}`);
    // await ctx.answerCallbackQuery(`您点击了按钮: ${data}`);
    await handleRenewalMessage(ctx);
  },
);

callbackComposer.callbackQuery(
  'subscribe:biweekly',
  async (ctx: CallbackQueryContext<MyContext>) => {
    const data = ctx.callbackQuery?.data;

    debug(`用户点击了按钮: ${data}`);

    // 创建一个新的支付记录
    // const payment = new Payment({
    //   amount: 20, // 两周订阅费用
    //   status: 'pending',
    //   type: 'subscription',
    //   expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15分钟后过期
    //   botUser: ctx.from?.id,
    //   bot: ctx.me.id,
    // });

    // // 保存支付记录
    // await payment.save();

    // // 生成支付二维码或链接
    // const paymentLink = `https://example.com/pay/${payment._id}`;

    // // 发送支付信息给用户
    // await ctx.reply(
    //   `请在15分钟内完成支付:\n支付金额: ${payment.amount} USDT\n支付链接: ${paymentLink}`,
    //   {
    //     parse_mode: 'HTML',
    //   }
    // );

    await ctx.reply('xxx');
  },
);

export default callbackComposer;
