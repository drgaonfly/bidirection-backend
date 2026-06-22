import { Response } from 'express';
import Subscription from '../models/subscription';
import Bot from '../models/bot';
import User from '../models/user';
import handleAsync from '../utils/handleAsync';
import { RequestCustom } from '../types/user';
import { isProxy, isEmployee } from '../middlewares/authMiddleware';

// ── GET /subscriptions ──────────────────────────────────────
export const getSubscriptions = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;
    const query: any = {};

    if (req.query.status) {
      query.status = req.query.status;
    }

    // 按 bot 名称搜索
    if (req.query.bot) {
      const bots = await Bot.find({
        botName: { $regex: req.query.bot as string, $options: 'i' },
      }).lean();
      query.bot = { $in: bots.map((b) => b._id) };
    }

    // 代理数据隔离：只能看自己名下 bot 的订阅
    if (isProxy(req.user)) {
      const bots = await Bot.find({ user: req.user._id }).lean();
      query.bot = { $in: bots.map((b) => b._id) };
    }

    if (isEmployee(req.user)) {
      const bots = await Bot.find({ user: req.user._id }).lean();
      query.bot = { $in: bots.map((b) => b._id) };
    }

    const subscriptions = await Subscription.find(query)
      .populate({
        path: 'bot',
        select: 'botName userName topicSubscriptionExpiredAt user',
        populate: {
          path: 'user',
          select: 'trx20_address topicSubscriptionMonthlyFee',
        },
      })
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .lean();

    const total = await Subscription.countDocuments(query);

    res.json({
      success: true,
      data: subscriptions,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

// ── POST /subscriptions — 后台手动为 bot 创建 pending 订单（测试 / 代操作）
export const createSubscription = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { botId, timeoutMinutes = 60 } = req.body;

    const bot = await Bot.findById(botId)
      .select('botName activeTopicGroup user')
      .lean();

    if (!bot) {
      res.status(404);
      throw new Error('Bot 不存在');
    }

    // 从 bot 所属用户取收款配置
    const proxyUser = await User.findById(bot.user)
      .select('trx20_address topicSubscriptionMonthlyFee')
      .lean();

    if (!proxyUser?.trx20_address) {
      res.status(400);
      throw new Error('所属用户未配置 trx20 收款地址');
    }

    if (!bot.activeTopicGroup) {
      res.status(400);
      throw new Error('Bot 未配置话题群组，无法创建话题订阅订单');
    }

    // 若已有 pending 订单（未超时）则直接返回，避免重复
    const existing = await Subscription.findOne({
      bot: botId,
      status: 'pending',
      orderExpiredAt: { $gt: new Date() },
    }).lean();

    if (existing) {
      res.json({
        success: true,
        data: existing,
        message: '已有 pending 订单，直接返回',
      });
      return;
    }

    const orderExpiredAt = new Date();
    orderExpiredAt.setMinutes(
      orderExpiredAt.getMinutes() + Number(timeoutMinutes),
    );

    const baseFee = proxyUser.topicSubscriptionMonthlyFee ?? 25;
    const tail = Math.floor(Math.random() * 99 + 1) / 100;
    const uniqueAmount = Math.round((baseFee + tail) * 100) / 100;

    const order = await Subscription.create({
      bot: botId,
      amount: uniqueAmount,
      toAddress: proxyUser.trx20_address,
      orderExpiredAt,
      status: 'pending',
    });

    res.status(201).json({ success: true, data: order });
  },
);
