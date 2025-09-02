import { Request, Response } from 'express';
import Withdraw from '../models/withdraw';
import handleAsync from '../utils/handleAsync';
import { RequestCustom } from '../types/user';
import User from '../models/user';
import { IBot } from '../models/bot';
import { findBotProxy } from '../services/findBotProxy';
import { isValidTronAddress } from '../utils/TronAddressTest';
import { sendTRXByWithdraw } from '../utils/sendTRX';
import { sendUSDTByWithdraw } from '../utils/sendUSDT';
import { getAdminUser } from '../utils/buyTelegramPremium';

const buildQuery = async (queryParams: any): Promise<any> => {
  const query: any = {};

  // type
  if (queryParams.type) {
    query.type = queryParams.type;
  }

  // status
  if (queryParams.status) {
    query.status = queryParams.status;
  }

  return query;
};

export const getWithdraws = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;

    const query = await buildQuery(req.query);

    const withdraws = await Withdraw.find(query)
      .populate('proxy')
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .lean()
      .exec();

    const total = await Withdraw.countDocuments(query).exec();

    res.json({
      success: true,
      data: withdraws,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const getWithdrawById = handleAsync(
  async (req: Request, res: Response) => {
    const withdraw = await Withdraw.findOne({
      _id: req.params.id,
    })
      .populate('proxy')
      .lean();

    if (!withdraw) {
      res.status(404);
      throw new Error('提现记录未找到');
    }

    res.json({
      success: true,
      data: withdraw,
    });
  },
);

export const addWithdraw = handleAsync(
  async (req: RequestCustom, res: Response) => {
    if (!isValidTronAddress(req.body.address)) {
      res.status(400);
      throw new Error(
        '提现地址格式不正确,必须是波场地址(以T开头,后面跟33个字母或数字)',
      );
    }

    const withdraw = new Withdraw({
      ...req.body,
      proxy: req.user._id,
    });

    const savedWithdraw = await withdraw.save();

    res.status(201).json({
      success: true,
      data: savedWithdraw,
    });
  },
);

export const updateWithdraw = handleAsync(
  async (req: Request, res: Response) => {
    const withdraw = await Withdraw.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    if (!withdraw) {
      res.status(404);
      throw new Error('提现记录未找到');
    }

    res.json({
      success: true,
      data: withdraw,
    });
  },
);

export const deleteWithdraw = handleAsync(
  async (req: Request, res: Response) => {
    const withdraw = await Withdraw.deleteOne({
      _id: req.params.id,
    });

    if (!withdraw) {
      res.status(404);
      throw new Error('提现记录未找到');
    }

    res.json({
      success: true,
      message: '提现记录已删除',
    });
  },
);

export const deleteMultipleWithdraws = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await Withdraw.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: '提现记录批量删除成功',
    });
  },
);

export const approveWithdraw = handleAsync(
  async (req: Request, res: Response) => {
    try {
      const withdraw = await Withdraw.findByIdAndUpdate(
        req.params.id,
        { status: 'approved' },
        {
          new: true,
        },
      );

      if (!withdraw) {
        res.status(404);
        throw new Error('提现记录未找到');
      }

      // 获取用户所有机器人的余额总和
      const user = await User.findById(withdraw.proxy).populate({
        path: 'bots',
        options: { sort: { createdAt: -1 } }, // 按创建时间倒序排序
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      const userBots = user.bots as IBot[];
      if (!userBots || userBots.length === 0) {
        throw new Error('用户没有可用的机器人');
      }

      let remainingAmount = withdraw.amount;

      // 遍历机器人，从最新的开始扣除余额
      for (const bot of userBots) {
        if (remainingAmount <= 0) break;

        const { proxyBotUserConfig } = await findBotProxy(bot);
        if (!proxyBotUserConfig) continue;

        const balance =
          withdraw.type === 'usdt_balance'
            ? proxyBotUserConfig.usdt_balance || 0
            : proxyBotUserConfig.trx_balance || 0;

        if (balance <= 0) continue;

        // 计算本次从这个配置扣除的金额
        const deductAmount = Math.min(balance, remainingAmount);

        // 更新配置余额
        if (withdraw.type === 'usdt_balance') {
          proxyBotUserConfig.usdt_balance -= deductAmount;
        } else {
          proxyBotUserConfig.trx_balance -= deductAmount;
        }

        // 保存更新后的配置
        await proxyBotUserConfig.save();

        remainingAmount -= deductAmount;
      }

      const admin = await getAdminUser();

      if (withdraw.type === 'trx_balance') {
        await sendTRXByWithdraw(withdraw, admin.withdraw_privateKey);
      } else {
        await sendUSDTByWithdraw(withdraw, admin.withdraw_privateKey);
      }

      res.json({
        success: true,
        data: withdraw,
      });
    } catch (error) {
      res.status(500);
      res.json({
        success: false,
        message: error.message || '提现审批失败',
      });
    }
  },
);

export const rejectWithdraw = handleAsync(
  async (req: Request, res: Response) => {
    const withdraw = await Withdraw.findByIdAndUpdate(
      req.params.id,
      { status: 'refused', remark: req.body.remark },
      {
        new: true,
      },
    );

    if (!withdraw) {
      res.status(404);
      throw new Error('提现记录未找到');
    }

    res.json({
      success: true,
      data: withdraw,
    });
  },
);
