import Bot from '../../models/bot';
import Rental from '../../models/rental';
import { fetchTrxTransactions } from '../../utils/fetchTransactions';
import { IdGen } from '../../utils/idGen';
import { rentEnergy } from '../../utils/fetchTransactions';
import createDebug from 'debug';

import { TronWeb } from 'tronweb';
// import UnRental from '../../models/unrental';

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
});

const debug = createDebug('cron:checkAutoRentals');

/**
 * 检查所有 pending 的充值订单，只有当 bot.trx20_address 收到正确金额，才为用户充值
 */
export async function checkAutoRentals() {
  debug('checkAutoRentals');

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

      console.log(
        `[checkAutoRentals] bot ${bot.id} 有 ${deepFilteredTransfers.length} 条新转账待处理`,
      );

      for (const transfer of deepFilteredTransfers) {
        try {
          console.log(
            `[checkAutoRentals] 处理转账 trade_id=${transfer.trade_id}, 金额=${transfer.money}, from=${transfer.from_address}`,
          );

          const newId = await IdGen.next(Rental, 'id', 6);
          console.log(`[checkAutoExchanges] 生成新兑换记录 id=${newId}`);

          // 检查 transfer.money 是否和 price_pairs 里任意 expenditure 相等
          const matchedPricePair = Array.isArray(bot.price_pairs)
            ? bot.price_pairs.find(
                (pair) => pair.expenditure === transfer.money,
              )
            : undefined;

          if (!matchedPricePair) {
            console.log(
              `[checkAutoRentals] bot: ${bot.id} 下的收入 没有匹配的 price_pair, 跳过`,
            );
            continue;
          }

          // 创建已支付的兑换记录
          const rental = await Rental.create({
            id: await IdGen.next(Rental, 'id', 6),
            from_address: transfer.from_address,
            to_address: transfer.to_address,
            amount: matchedPricePair.aqusition,
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

          console.log(
            `[checkAutoRentals] 已创建租赁记录 id=${rental.id}, hash=${rental.hash}`,
          );

          // 发起 能量租赁
          try {
            const txid = await rentEnergy(
              rental,
              transfer.from_address,
              rental.amount,
              'trx',
            );

            console.log(`[checkAutoRentals] 能量租赁成功, txid=${txid}`);
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
