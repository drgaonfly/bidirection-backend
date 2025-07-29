// applicationController.ts

import { Request, Response } from 'express';
import Application from '../models/application'; // 替换为你的 Application 模型
import handleAsync from '../utils/handleAsync';
import { IdGen } from '../utils/idGen';
import Bot from '../models/bot';
import BotUser from '../models/botUser';

const buildQuery = async (queryParams: any): Promise<any> => {
  const query: any = {};

  if (queryParams.bot) {
    const botData = await Bot.find({
      botName: {
        $regex: queryParams.bot,
        $options: 'i',
      },
    });

    query.bot =
      botData.length > 0 ? { $in: botData.map((bot) => bot._id) } : null;
  }

  if (queryParams.botUser) {
    const botUsers = await BotUser.find({
      userName: {
        $regex: queryParams.botUser,
        $options: 'i',
      },
    });

    query.botUser =
      botUsers.length > 0 ? { $in: botUsers.map((user) => user._id) } : null;
  }

  return query;
};

export const getApplications = handleAsync(
  async (req: Request, res: Response) => {
    const { current = '1', pageSize = '10' } = req.query;
    const query = await buildQuery(req.query);

    const applications = await Application.find(query)
      .sort('-createdAt')
      .skip((+current - 1) * +pageSize)
      .limit(+pageSize)
      .populate('botUser')
      .populate('bot')
      .lean()
      .exec();

    const total = await Application.countDocuments(query).exec();

    res.json({
      success: true,
      data: applications,
      total,
      current: +current,
      pageSize: +pageSize,
    });
  },
);

export const getApplicationById = handleAsync(
  async (req: Request, res: Response) => {
    const application = await Application.findOne({ _id: req.params.id })
      .populate('botUser')
      .populate('bot')
      .lean();

    if (!application) {
      res.status(404);
      throw new Error('代理申请未找到');
    }

    res.json({
      success: true,
      data: application,
    });
  },
);

export const addApplication = handleAsync(
  async (req: Request, res: Response) => {
    const newId = await IdGen.next(Application, 'id', 6);

    const application = new Application({
      ...req.body,
      id: newId,
    });

    const savedApplication = await application.save();

    res.status(201).json({
      success: true,
      data: savedApplication,
    });
  },
);

export const updateApplication = handleAsync(
  async (req: Request, res: Response) => {
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      },
    );

    if (!application) {
      res.status(404);
      throw new Error('代理申请未找到');
    }

    res.json({
      success: true,
      data: application,
    });
  },
);

export const deleteApplication = handleAsync(
  async (req: Request, res: Response) => {
    const application = await Application.deleteOne({ _id: req.params.id });

    if (!application) {
      res.status(404);
      throw new Error('代理申请未找到');
    }

    res.json({
      success: true,
      message: '代理申请已删除',
    });
  },
);

export const deleteMultipleApplications = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;
    await Application.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: '代理申请批量删除成功',
    });
  },
);
