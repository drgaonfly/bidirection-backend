import { Composer } from 'grammy';
import { MyContext } from '../../../../types';
import createDebug from 'debug';
import { handleRechargeRequest } from '../helper';
import { handleChargingBalance } from '../chargingBalance';

const specificRechargeCallback = new Composer<MyContext>();
const debug = createDebug('bot:specific-recharge');

specificRechargeCallback.callbackQuery(/^charge_(\d+)$/, async (ctx) => {
  debug('处理特定金额充值');

  await ctx.conversation.exitAll();

  // 拿到里面的数字
  const match = ctx.callbackQuery.data.match(/^charge_(\d+)$/);
  if (!match) return;

  const actualAmount = parseInt(match[1], 10);

  debug(`处理金额: ${actualAmount}`);

  const success = await handleRechargeRequest(ctx, actualAmount);

  if (!success) {
    debug('处理特定金额充值失败');
    ctx.reply('处理特定金额充值失败');
  }
});

specificRechargeCallback.callbackQuery(/recharge:again/, async (ctx) => {
  debug('重新发起充值');

  await ctx.conversation.exitAll();

  await handleChargingBalance(ctx);
});

export default specificRechargeCallback;
