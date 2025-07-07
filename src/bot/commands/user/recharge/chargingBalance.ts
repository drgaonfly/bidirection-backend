import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import charger from '../../../menus/inline/charger';
import createDebug from 'debug';

const chargingBalanceCommand = new Composer<MyContext>();
const debug = createDebug('bot:charging-balance');

const keys = ['💳 充值余额', '💳 Recharge']; // 支持中英文

// 监听"充值余额"文本消息
export async function handleChargingBalance(ctx: MyContext) {
  debug('充值余额命令被触发');
  await ctx.reply(
    `💰请选择下面充值订单金额\n📈请严格按照小数点转账❗️❗️\n💵当前余额:${ctx.currentBotUserConfig.usdt_balance.toFixed(
      3,
    )} USDT`,
    {
      reply_markup: charger,
    },
  );
}

chargingBalanceCommand.hears(keys, async (ctx) => {
  await handleChargingBalance(ctx);
});

chargingBalanceCommand.callbackQuery('recharge', async (ctx) => {
  await handleChargingBalance(ctx);
});

chargingBalanceCommand.callbackQuery('close', async (ctx) => {
  await ctx.conversation.exitAll();

  await ctx.deleteMessage();
  await ctx.answerCallbackQuery('已取消充值');
});

export default chargingBalanceCommand;
