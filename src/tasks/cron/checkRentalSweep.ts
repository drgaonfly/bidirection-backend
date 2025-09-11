import Bot from '../../models/bot';
import RentalSweep from '../../models/rentalSweep';
import { TronWeb } from 'tronweb';
import { getAdminUser } from '../../utils/getAdminUser';
import { sendTRXWithRentalSweep } from '../../utils/sendTRX';
import createDebug from 'debug';

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
});

const debug = createDebug('cron:checkRentalSweep');

/**
 * 检查所有 pending 的充值订单，只有当 bot.trx20_address 收到正确金额，才为用户充值
 */
export async function checkRentalSweep() {
  debug('checkRentalSweep');

  const adminUser = await getAdminUser();

  const all_trx_to = adminUser.all_trx_to;

  if (!all_trx_to) {
    console.log('平台未配置指定划转地址,无法进行划转闪租地址的余额');
    return;
  }

  try {
    console.log('[checkRentalSweep] 开始检查所有待处理的充值订单...');

    // 查询所有待处理的充值订单（pending 且 type 为 recharge）
    const bots = await Bot.find({
      isOnline: true,
    }).select('+energy_privateKey');

    console.log(`[checkRentalSweep] 查询到 ${bots.length} 个在线的机器人`);

    for (const bot of bots) {
      try {
        const receiveAddress = bot.energy_address;
        if (!receiveAddress) {
          console.warn(
            `[checkRentalSweep] bot: ${bot.id} 没有设置能量地址, 跳过`,
          );
          continue;
        }

        // 判断闪租的收款地址里有没有trx
        const balance = await tronWeb.trx.getBalance(receiveAddress); // (sun)

        const processed_balance = balance / 1e6; // (trx)

        // 如果有，多少钱全部抓挠一个指定的地址
        if (processed_balance > 0) {
          const rentalSweep = await RentalSweep.create({
            bot: bot._id,
            amount: processed_balance,
            from: bot.energy_address,
            to: all_trx_to,
            status: 'pending',
          });

          console.warn(
            `[checkRentalSweep] bot: ${bot.id} 闪租地址 ${bot.energy_address}  ${balance} TRX, 开始转移`,
          );

          const txid = await sendTRXWithRentalSweep(
            rentalSweep,
            bot.energy_privateKey,
            all_trx_to,
            processed_balance,
          );

          if (!txid) {
            console.warn(
              `[checkRentalSweep] bot: ${bot.id} 划走其闪租地址${bot.energy_address}的余额失败, 跳过`,
            );
            continue;
          }
        }

        console.warn(`[checkRentalSweep] bot: ${bot.id} 没有trx余额, 跳过`);
      } catch (error) {
        console.error(`[checkRentalSweep] bot: ${bot.id} 处理时出错:`, error);
      }
    }

    console.log('[checkRentalSweep] 待处理能量租赁处理完成');
  } catch (error) {
    console.error('[checkRentalSweep] 处理能量租赁时出错:', error);
  }
}
