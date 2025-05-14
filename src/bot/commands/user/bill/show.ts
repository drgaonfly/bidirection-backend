import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import createDebug from 'debug';
import { useSummary } from '../../../../utils/useEjsMessage';
import { useTransactionData } from '../../../hook/summary';
import { isOperatorOrCreator } from '../../../../bot/middlewares/checkBotUser';
import { checkGroup } from '../../../../bot/middlewares/checkGroup';
import { checkIsOnline } from '../../../../bot/middlewares/checkIsOnline';

const showBillCommand = new Composer<MyContext>();

const debug = createDebug('bot:show-bill');

// 显示账单命令处理
showBillCommand.hears(
  /显示账单/,
  checkGroup,
  isOperatorOrCreator,
  checkIsOnline,
  async (ctx) => {
    debug('bot:show-bill');

    const group = ctx.currentGroup;
    const renderSummary = useSummary();

    // 获取交易数据
    const { withdraws, deposits } = await useTransactionData(group);

    // 渲染账单消息
    const message = await renderSummary({
      deposits,
      withdraws,
      feeRate: group.fee_rate,
      exchangeRate: group.exchange_rate,
      unit: 'USD',
    });

    await ctx.reply(message, { parse_mode: 'HTML' });
  },
);

export default showBillCommand;
