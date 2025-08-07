import { Composer } from 'grammy';
import { MyContext } from '../../../../types';
import createDebug from 'debug';
import { handleRechargeRequest } from '../helper';
import { handleChargingBalance } from '../chargingBalance';

const specificRechargeCallback = new Composer<MyContext>();
const debug = createDebug('bot:specific-recharge');

specificRechargeCallback.callbackQuery(/^charge_(\d+):(\w+)$/, async (ctx) => {
  debug('处理特定金额充值');

  await ctx.conversation.exitAll();

  // 拿到里面的数字
  const match = ctx.callbackQuery.data.match(/^charge_(\d+):(\w+)$/);
  if (!match) return;

  const actualAmount = parseInt(match[1], 10);

  const cryptoType = match[2].trim();

  debug(`处理金额: ${actualAmount}`);

  const success = await handleRechargeRequest(
    ctx,
    actualAmount,
    cryptoType,
    ctx.currentBot,
  );

  if (!success) {
    debug('处理特定金额充值失败');
    ctx.reply('处理特定金额充值失败');
  }
});

specificRechargeCallback.callbackQuery(/recharge:again/, async (ctx) => {
  debug('重新发起充值');

  await ctx.conversation.exitAll();

  console.log('ctx.currentBot.proxy', ctx.currentBot.user);

  await handleChargingBalance(ctx);
});

export default specificRechargeCallback;
