import { Composer } from 'grammy';
import { MyContext } from '../../../types';
import { handleWalletListWithoutInlineMenu } from './handleWalletList';
import { formatBeijingDate } from '../../../../utils/formatBeijingDate';
import axios, { AxiosError } from 'axios';
import createDebug from 'debug';

const debug = createDebug('bot:wallet:show');

const walletShowComposer = new Composer<MyContext>();

export const handleShow = async (ctx: MyContext, page = 1) => {
  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '➕ 添加地址', callback_data: 'wallet_add_address' },
        { text: '⚙️ 设置地址', callback_data: 'wallet_set_address' },
        { text: '🗑 删除地址', callback_data: 'wallet_delete_address' },
      ],
      [{ text: '❌ 取消', callback_data: 'close' }],
    ],
  };
  const { replyText } = await handleWalletListWithoutInlineMenu(ctx, page);

  await ctx.reply(replyText, {
    parse_mode: 'HTML',
    reply_markup: inlineKeyboard,
  });
};

const formatTransaction = (tx: any, walletAddress: string) => {
  // 只处理USDT转账交易
  if (!tx.trigger_info || tx.contractRet !== 'SUCCESS') {
    return null;
  }

  const date = new Date(tx.block_ts);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  const amount = (Number(tx.quant) / 1_000_000).toFixed(2);
  const type = tx.from_address === walletAddress ? '－' : '＋';

  return `${month}-${day} ${hour}:${minute}:${second} [USDT]${type}<a href="https://tronscan.org/#/transaction/${tx.transaction_id}">${amount}</a>`;
};

const formatWalletInfo = async (address: string, data: any, ctx: MyContext) => {
  try {
    const trxBalance = (data.balance / 1_000_000).toFixed(6);
    const usdtToken = data.trc20token_balances?.find(
      (token: any) => token.tokenAbbr === 'USDT',
    );
    const usdtBalance = usdtToken
      ? (usdtToken.balance / 1_000_000).toFixed(5)
      : '0';

    const bandwidth = data.bandwidth || {
      energyRemaining: 0,
      energyLimit: 0,
      netRemaining: 0,
      netLimit: 0,
    };
    const energyRemaining = bandwidth.energyRemaining;
    const energyLimit = bandwidth.energyLimit;
    const netRemaining = bandwidth.netRemaining;
    const netLimit = bandwidth.netLimit;

    const formattedCreatedDate = formatBeijingDate(data.date_created);

    // 获取最近交易
    debug('Fetching recent transactions for address:', address);
    const txResponse = await axios.get(
      `https://apilist.tronscan.org/api/token_trc20/transfers?limit=20&start=0&sort=-timestamp&relatedAddress=${address}&contract_address=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`,
      { timeout: 10000 }, // 10 seconds timeout
    );

    const recentTxs =
      txResponse.data.token_transfers
        ?.map((tx) => formatTransaction(tx, address))
        .filter(Boolean)
        .join('\n') || '暂无交易记录';

    return [
      `@${ctx.currentBot.botName} 的钱包查询`,
      '',
      `查询地址：<code>${address}</code>`,
      `TRX余额：${trxBalance}`,
      `usdt余额：${usdtBalance}`,
      `质押冻结：${data.totalFrozen || 0}`,
      `可用能量：${energyRemaining} / ${energyLimit}`,
      `可用带宽：${netRemaining} / ${netLimit}`,
      `交易总数：${data.totalTransactionCount || 0} 笔交易`,
      `收支比例：收${data.transactions_in || 0} / 付${
        data.transactions_out || 0
      }`,
      `创建时间：${formattedCreatedDate}`,
      '',
      `多签授权：${
        data.activePermissions?.length > 1 ? '已多签⚠️' : '未多签✅'
      }`,
      '',
      '最近交易：',
      recentTxs,
    ].join('\n');
  } catch (error) {
    debug('Error in formatWalletInfo:', error);
    throw error;
  }
};

walletShowComposer.hears(/^🏦 地址监听$/, async (ctx) => {
  debug('🏦 地址监听');

  await handleShow(ctx, 1);
});

walletShowComposer.hears(/T[a-zA-Z0-9]{33}$/, async (ctx, next) => {
  // 是否在对话状态 conversation
  if (
    (ctx.conversation?.active &&
      ctx.conversation.active('transferExchangeConversation')) ||
    ctx.conversation.active('walletAddAddressConversation') ||
    ctx.conversation.active('walletDeleteAddressConversation')
  ) {
    return await next();
  }

  const address = ctx.match[0];

  if (!/T[a-zA-Z0-9]{33}$/.test(address)) {
    await ctx.reply('❌ 请输入有效的波场地址格式');
    return;
  }

  debug('Fetching wallet info for address:', address);

  try {
    const response = await axios.get(
      `https://apilist.tronscan.org/api/account?address=${address}`,
      { timeout: 10000 }, // 10 seconds timeout
    );

    if (!response.data) {
      throw new Error('No data received from API');
    }

    const formattedResponse = await formatWalletInfo(
      address,
      response.data,
      ctx,
    );
    await ctx.reply(formattedResponse, { parse_mode: 'HTML' });
  } catch (error) {
    debug('Error fetching wallet info:', error);

    let errorMessage = '获取钱包信息失败，请稍后重试。';
    if (error instanceof AxiosError) {
      if (error.code === 'ECONNABORTED') {
        errorMessage = '查询超时，请稍后重试。';
      } else if (error.response?.status === 429) {
        errorMessage = '查询频率过高，请稍后再试。';
      } else if (error.response?.status === 404) {
        errorMessage = '未找到该地址信息，请确认地址是否正确。';
      }
    }

    await ctx.reply(errorMessage);
  }
});

export default walletShowComposer;
