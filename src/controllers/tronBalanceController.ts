import { Request, Response } from 'express';
import { TronWeb } from 'tronweb';
import { IdGen } from '../utils/idGen';
import TronBalance from '../models/tronBalance';
import handleAsync from '../utils/handleAsync';
import Bot from '../models/bot';

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
});

const buildQuery = async (queryParams: any): Promise<any> => {
  const query: any = {};

  if (queryParams.bot) {
    const botData = await Bot.find({
      botName: {
        $regex: queryParams.bot,
        $options: 'i',
      },
    });

    if (botData && botData.length > 0) {
      query.bot = { $in: botData.map((bot) => bot._id) };
    } else {
      query.bot = null;
    }
  }

  if (queryParams.address) {
    query.address = queryParams.address;
  }

  return query;
};

async function getUsdtBalance(address: string): Promise<number> {
  try {
    const result = await tronWeb.transactionBuilder.triggerSmartContract(
      USDT_CONTRACT,
      'balanceOf(address)',
      {},
      [{ type: 'address', value: address }],
      address, // owner_address 必须传
    );

    if (!result.constant_result || !result.constant_result[0]) return 0;

    return parseInt(result.constant_result[0], 16) / 1e6;
  } catch (e) {
    console.error(`[getUsdtBalance] 地址 ${address} 查询失败:`, e);
    return 0;
  }
}

// TRC20 USDT 合约地址（主网）
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

export const getTronBalances = handleAsync(
  async (req: Request, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    // 先查出在线 bot
    const bots = await Bot.find({ isOnline: true }).select('+energy_address');

    for (const bot of bots) {
      if (!bot.energy_address) continue;

      try {
        const trxBalance = await tronWeb.trx.getBalance(bot.energy_address);
        const usdtBalance = await getUsdtBalance(bot.energy_address);

        // 更新或创建 TronBalance
        await TronBalance.findOneAndUpdate(
          { address: bot.energy_address },
          {
            bot: bot._id,
            address: bot.energy_address,
            trx_amount: trxBalance / 1e6,
            usdt_amount: usdtBalance / 1e6, // USDT 精度 6
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      } catch (error) {
        console.error(
          `[getTronBalances] bot ${bot._id} 地址 ${bot.energy_address} 查询失败:`,
          error,
        );
      }
    }

    // 构建查询条件
    const query = await buildQuery(req.query);

    // 分页返回最新 TronBalance
    const tronBalances = await TronBalance.find(query)
      .populate('bot')
      .sort('-updatedAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .lean()
      .exec();

    const total = await TronBalance.countDocuments(query).exec();

    res.json({
      success: true,
      data: tronBalances,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const getTronBalanceById = handleAsync(
  async (req: Request, res: Response) => {
    const tronBalance = await TronBalance.findOne({
      _id: req.params.id,
    })
      .populate('bot')
      .lean();

    if (!tronBalance) {
      res.status(404);
      throw new Error('Tron balance record not found');
    }

    res.json({
      success: true,
      data: tronBalance,
    });
  },
);

export const addTronBalance = handleAsync(
  async (req: Request, res: Response) => {
    const newId = await IdGen.next(TronBalance, 'id', 6);

    const tronBalance = new TronBalance({
      ...req.body,
      id: newId,
    });

    const savedTronBalance = await tronBalance.save();

    res.status(201).json({
      success: true,
      data: savedTronBalance,
    });
  },
);

export const updateTronBalance = handleAsync(
  async (req: Request, res: Response) => {
    const tronBalance = await TronBalance.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      },
    );

    if (!tronBalance) {
      res.status(404);
      throw new Error('Tron balance record not found');
    }

    res.json({
      success: true,
      data: tronBalance,
    });
  },
);

export const deleteTronBalance = handleAsync(
  async (req: Request, res: Response) => {
    const tronBalance = await TronBalance.deleteOne({
      _id: req.params.id,
    });

    if (!tronBalance) {
      res.status(404);
      throw new Error('Tron balance record not found');
    }

    res.json({
      success: true,
      message: 'Tron balance record deleted',
    });
  },
);

export const deleteMultipleTronBalances = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await TronBalance.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: 'Tron balance records deleted successfully',
    });
  },
);
