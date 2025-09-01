import Bot from '../../models/bot';
import Rental from '../../models/rental';
import Integer from '../../models/integer';
import {
  fetchTrxTransactions,
  deductProxyTrxBalance,
} from '../../utils/fetchTransactions';
import { IdGen } from '../../utils/idGen';
import { rentEnergy } from '../../utils/fetchTransactions';
import { TronWeb } from 'tronweb';
import { setupBot } from '../../bot/botSetup';
import { InlineKeyboard } from 'grammy';
import { findBotProxy } from '../../services/findBotProxy';
import { getAdminUser } from '../../utils/buyTelegramPremium';
import { IRental } from '../../models/rental';
import BotUserConfig from '../../models/botUserConfig';
import createDebug from 'debug';

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
});

const debug = createDebug('cron:checkAutoRentals');

async function awardProxyPoints(
  botId: any,
  pens: number,
  rental: IRental,
  level: number = 0,
) {
  // 级别对应的积分比例
  const ratios = [0.5, 0.3, 0.1];
  if (!botId || level >= ratios.length) return;

  const bot = await Bot.findById(botId);
  if (!bot) return;

  const proxy = await findBotProxy(bot);
  if (proxy && proxy.proxyBotUser) {
    await BotUserConfig.findByIdAndUpdate(proxy.proxyBotUserConfig._id, {
      $inc: {
        point: pens * ratios[level],
      },
    });

    await Integer.create({
      bot: bot._id,
      botUser: proxy.proxyBotUser,
      amount: pens * ratios[level],
      type: 'Rental',
      deductable: rental,
    });
  }

  if (bot.clonedFrom) {
    await awardProxyPoints(bot.clonedFrom, pens, rental, level + 1);
  }
}

/**
 * 检查所有 pending 的充值订单，只有当 bot.trx20_address 收到正确金额，才为用户充值
 */
export async function checkAutoRentals() {
  debug('checkAutoRentals');
  const adminUser = await getAdminUser();

  if (!adminUser.energy_per_times) {
    throw new Error('管理员未设置每笔多少能量');
  }

  try {
    console.log('[checkAutoRentals] 开始检查所有待处理的充值订单...');

    // 查询所有待处理的充值订单（pending 且 type 为 recharge）
    const bots = await Bot.find({
      isOnline: true,
    }).populate('price_pairs');

    console.log(`[checkAutoRentals] 查询到 ${bots.length} 个在线的机器人`);

    for (const bot of bots) {
      const receiveAddress = bot.energy_address;
      if (!receiveAddress) {
        console.warn(
          `[checkAutoRentals] bot: ${bot.id} 没有设置能量地址, 跳过`,
        );
        continue;
      }

      let transfers;

      try {
        const { data } = await fetchTrxTransactions(receiveAddress);

        const rawTransfers = data as any[];

        // console.log('data',data)

        // 👇 提取 TRX 主币转账（TransferContract）
        transfers = rawTransfers
          .filter((tx) => {
            const contractType = tx.raw_data?.contract?.[0]?.type;
            return contractType === 'TransferContract';
          })
          .map((tx) => {
            const param = tx.raw_data.contract[0].parameter.value;
            return {
              money: param.amount / 1_000_000, // sun -> TRX
              from_address: tronWeb.address.fromHex(param.owner_address),
              to_address: tronWeb.address.fromHex(param.to_address),
              time: Math.floor(tx.block_timestamp / 1000),
              trade_id: tx.txID,
            };
          });

        // console.log('transfers', transfers);

        console.log(`[checkAutoRentals] 获取地址 ${receiveAddress} 的转账成功`);
        // console.log(transfers);
      } catch (err) {
        console.error(
          `[checkAutoRentals] 获取地址 ${receiveAddress} 的转账失败:`,
          err,
        );
        continue;
      }

      // 只查入账交易
      const filteredTransfers = transfers.filter(
        (transfer) =>
          transfer.to_address === receiveAddress &&
          transfer.from_address !== receiveAddress,
      );

      console.log(
        `[checkAutoRentals] bot ${bot.id} 筛选出 ${filteredTransfers.length} 条转入交易`,
      );
      if (filteredTransfers.length > 0) {
        filteredTransfers.forEach((t, idx) => {
          console.log(
            `[checkAutoRentals] 转入交易[${idx}]: trade_id=${t.trade_id}, from=${t.from_address}, to=${t.to_address}, money=${t.money}`,
          );
        });
      }

      // 只处理那些哈希不在Rental表的transfer
      const existingRentals = await Rental.find({
        hash: { $in: filteredTransfers.map((t) => t.trade_id) },
      }).select('hash');

      const existingHashes = new Set(existingRentals.map((e) => e.hash));

      const deepFilteredTransfers = filteredTransfers.filter(
        (transfer) =>
          transfer.trade_id && !existingHashes.has(transfer.trade_id),
      );

      console.log('[checkAutoRentals] filteredTransfers:', filteredTransfers);
      console.log('[checkAutoRentals] existingRentals:', existingRentals);
      console.log('[checkAutoRentals] existingHashes:', existingHashes);
      console.log(
        '[checkAutoRentals] deepFilteredTransfers:',
        deepFilteredTransfers,
      );

      console.log(
        `[checkAutoRentals] bot ${bot.id} 有 ${deepFilteredTransfers.length} 条新转账待处理`,
      );

      for (const transfer of deepFilteredTransfers) {
        try {
          console.log(
            `[checkAutoRentals] 处理转账 trade_id=${transfer.trade_id}, 金额=${transfer.money}, from=${transfer.from_address}`,
          );

          const newId = await IdGen.next(Rental, 'id', 6);
          console.log(`[checkAutoRentals] 生成新记录 id=${newId}`);

          console.log(
            `[checkAutoRentals] bot ${bot.id} 的 price_pairs:`,
            bot.price_pairs,
          );

          // 检查 transfer.money 是否和 price_pairs 里任意 expenditure 相等
          const matchedPricePair = Array.isArray(bot.price_pairs)
            ? bot.price_pairs.find(
                (pair) => pair.expenditure === Number(transfer.money),
              )
            : undefined;

          if (!matchedPricePair) {
            console.log(
              `[checkAutoRentals] bot: ${bot.id} 下的收入 没有匹配的 price_pair, 跳过`,
            );
            continue;
          }

          if (!bot.isCreatedByAdmin) {
            // 调用 findBotProxy 并取值, 如果有一个没有就打印并 continue
            const { proxyBotUser, proxyBotUserConfig, proxyUser } =
              await findBotProxy(bot);

            console.log('[checkAutoRentals] 代理信息:');
            console.log('proxyBotUser:', proxyBotUser);
            console.log('proxyBotUserConfig:', proxyBotUserConfig);
            console.log('proxyUser:', proxyUser);

            if (!proxyBotUser || !proxyBotUserConfig || !proxyUser) {
              console.log(
                `[checkAutoRentals] bot: ${
                  bot.id
                } 下的收入 缺少代理信息, proxyBotUser: ${!!proxyBotUser}, proxyBotUserConfig: ${!!proxyBotUserConfig}, proxyUser: ${!!proxyUser}，跳过`,
              );
              continue;
            }

            // 用户下的要匹配 separation: matchedPricePair.times,
            // 查找用户 price_pairs 里 times 匹配的套餐
            const userPricePair = Array.isArray(proxyUser.price_pairs)
              ? proxyUser.price_pairs.find(
                  (pair) => pair.times === matchedPricePair.times,
                )
              : undefined;

            // 修复：userPricePair 可能为 undefined，且 userPricePair.userPricePair 不存在
            const commission = userPricePair
              ? userPricePair.commission
              : undefined;

            if (!commission) {
              console.log(
                `[checkAutoRentals] bot: ${bot.id} 下的收入 没有代理用户配置, 跳过`,
              );
              continue;
            }

            if (proxyBotUserConfig.trx_balance < Number(commission)) {
              console.log(
                `[checkAutoRentals] bot: ${bot.id} 下的收入 代理用户 ${proxyUser.id} 的 TRX 余额不足, 跳过`,
              );

              // 余额不足，通知代理用户充值
              const telegramBot = setupBot(bot.token);

              try {
                await telegramBot.api.sendMessage(
                  proxyBotUser.id, // 代理电报用户id
                  [
                    `⚠️ 您的 TRX 余额不足，无法为下级用户自动闪租能量。`,
                    '',
                    `当前余额：<b>${proxyBotUserConfig.trx_balance}</b> TRX`,
                    `所需金额：<b>${commission}</b> TRX`,
                    '',
                    `请及时充值以保证正常为下级用户自动闪租能量。`,
                  ].join('\n'),
                  {
                    parse_mode: 'HTML',
                    reply_markup: new InlineKeyboard()
                      .text('⚡️ 我要充值', 'recharge')
                      .text('📞 联系客服', 'contact'),
                  },
                );
                continue;
              } catch (err) {
                console.error(
                  '[checkAutoRentals] 通知代理用户余额不足失败:',
                  err,
                );
                continue;
              }
            }
          }

          const adminUser = await getAdminUser();

          // 计算总能量：每笔能量 × 笔数
          const totalEnergy =
            (adminUser.energy_per_times || 65000) * matchedPricePair.times;

          // 创建已支付的兑换记录
          const rental = await Rental.create({
            id: await IdGen.next(Rental, 'id', 6),
            from_address: transfer.from_address,
            to_address: transfer.to_address,
            amount: totalEnergy,
            separation: matchedPricePair.times,
            price: transfer.money,
            bot: bot._id,
            // botUser: botUser._id,
            status: 'pending',
            type: 'auto',
            crypto_type: 'trx',
            limit_hour: matchedPricePair.expiration,
            expiredAt: new Date(Date.now() + 30 * 60 * 1000),
            hash: transfer.trade_id,
            proxy: bot.user,
          });

          console.log('paid rental', rental);

          // 如果不是管理员创建的机器人，需要扣减代理用户 TRX 余额
          if (!bot.isCreatedByAdmin) {
            const { proxyBotUser, proxyBotUserConfig, proxyUser } =
              await findBotProxy(bot);

            // 获取佣金金额
            const userPricePair = Array.isArray(proxyUser.price_pairs)
              ? proxyUser.price_pairs.find(
                  (pair) => pair.times === matchedPricePair.times,
                )
              : undefined;
            const commission = userPricePair ? userPricePair.commission : 0;

            const success = await deductProxyTrxBalance(
              'Rental',
              bot,
              proxyBotUser,
              proxyBotUserConfig,
              proxyUser,
              commission,
              rental,
            );

            if (!success) {
              console.log(
                `[checkAutoRentals] bot: ${bot.id} 扣减代理用户 TRX 余额失败，跳过`,
              );
              continue;
            }
          }

          // 发起 能量租赁
          try {
            const txid = await rentEnergy(
              rental,
              transfer.from_address,
              rental.amount,
            );

            if (!bot.isCreatedByAdmin) {
              // 给代理们积分
              await awardProxyPoints(bot._id, 1, rental);
            }

            console.log(`[checkAutoRentals] 能量租赁成功, txid=${txid}`);

            console.log(
              `[checkAutoRentals] 已创建租赁记录 id=${rental.id}, hash=${rental.hash}`,
            );
          } catch (sendErr) {
            console.error(`[checkAutoRentals] 能量租赁成功失败:`, sendErr);
            // 这里可以考虑更新兑换状态为失败

            continue;
          }

          console.log(`[checkAutoRentals] 租赁记录 id=${rental.id} 已保存`);
        } catch (err) {
          console.error('[checkAutoRentals] 处理租赁记录时出错:', err);
          continue;
        }
      }
    }

    console.log('[checkAutoRentals] 待处理能量租赁处理完成');
  } catch (error) {
    console.error('[checkAutoRentals] 处理能量租赁时出错:', error);
  }
}
