import handleAsync from '../utils/handleAsync';
import BotUser from '../models/botUser'; // 引入botUser模型
import Bot from '../models/bot';
import Application from '../models/application';
import Package from '../models/package';
import bcrypt from 'bcrypt';
import User from '../models/user';
import Role from '../models/role';
import { IdGen } from '../utils/idGen';
import { Request, Response } from 'express';
import { RequestCustom } from 'user';
import { isEmployee, isProxy } from '../middlewares/authMiddleware';
import { generateInviteCode } from './userController';
import { getRandomUser } from '../services/ipGeoaddress';
import { encrypt } from '../services/encrypt';
import { setupBot } from '../bot/botSetup';

// Build query based on query parameters
const buildQuery = async (queryParams: any, req: RequestCustom) => {
  const query: any = {};

  if (queryParams.userName) {
    // 如果用户名以@开头,去掉@符号
    const processedUserName = queryParams.userName.startsWith('@')
      ? queryParams.userName.substring(1)
      : queryParams.userName;
    query.userName = { $regex: processedUserName, $options: 'i' };
  }
  if (queryParams.firstName) {
    query.firstName = { $regex: queryParams.firstName, $options: 'i' };
  }
  if (queryParams.lastName) {
    query.lastName = { $regex: queryParams.lastName, $options: 'i' };
  }
  if (queryParams.bot) {
    query.bot = queryParams.bot;
  }
  // isAuthorized
  if (queryParams.isAuthorized) {
    query.isAuthorized = queryParams.isAuthorized;
  }

  if (isProxy(req.user)) {
    const employees = await User.find({ proxy: req.user._id });
    const employeeIds = employees.map((employee) => employee._id);
    query.user = { $in: [...employeeIds, req.user._id] };
  }

  if (isEmployee(req.user)) {
    query.user = req.user._id;
  }

  if (queryParams.status) {
    query.status = queryParams.status;
  }

  return query;
};

// 获取所有Telegram用户
const getbotUsers = handleAsync(async (req: RequestCustom, res: Response) => {
  const { current = '1', pageSize = '10' } = req.query;

  const query = await buildQuery(req.query, req);

  const botUsers = await BotUser.find(query)
    .populate('transactions')
    .populate('payments')
    .populate('subscriptions')
    .populate('bound_proxy')
    .sort('-createdAt')
    .skip((+current - 1) * +pageSize)
    .limit(+pageSize)
    .exec();

  const total = await BotUser.countDocuments(query).exec();

  res.json({
    success: true,
    data: botUsers,
    total,
    current: +current,
    pageSize: +pageSize,
  });
});

// 根据 ID 获取Telegram用户
const getbotUserById = handleAsync(async (req: Request, res: Response) => {
  const getBotUser = await BotUser.findById(req.params.id)
    .populate('transactions')
    .populate('payments')
    .populate('subscriptions')
    .populate('bound_proxy')
    .exec();

  if (!getBotUser) {
    res.status(404);
    throw new Error('botUser not found');
  }

  res.json({
    success: true,
    data: getBotUser,
  });
});

// 添加新Telegram用户
const addbotUser = handleAsync(async (req: Request, res: Response) => {
  const newbotUser = new BotUser({
    ...req.body,
  });

  const savedbotUser = await newbotUser.save();

  res.json({
    success: true,
    data: savedbotUser,
  });
});

// 更新Telegram用户
const updatebotUser = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const updatedbotUser = await BotUser.findByIdAndUpdate(
    id,
    { ...req.body },
    { new: true },
  ).exec();

  if (!updatedbotUser) {
    res.status(404);
    throw new Error('botUser not found');
  }

  res.json({
    success: true,
    data: updatedbotUser,
  });
});

// 删除Telegram用户
const deletebotUser = handleAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const deletedBotUser = await BotUser.findByIdAndDelete(id).exec();

  if (!deletedBotUser) {
    res.status(404);
    throw new Error('botUser not found');
  }

  res.json({
    success: true,
    data: { message: 'botUser deleted successfully' },
  });
});

// 批量删除Telegram用户
const deleteMultiplebotUsers = handleAsync(
  async (req: Request, res: Response) => {
    const { ids } = req.body;

    await BotUser.deleteMany({
      _id: { $in: ids },
    }).exec();

    res.json({
      success: true,
      message: `${ids.length} botUsers deleted successfully`,
    });
  },
);

export const generateBoundProxy = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { id } = req.params;

    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error('该邮箱已被使用');
    }

    const randomUserInfo = await getRandomUser();

    const salt = await bcrypt.genSalt(10);
    const hashPassword = password
      ? await bcrypt.hash(password, salt)
      : await bcrypt.hash(randomUserInfo.password, salt);

    const inviteCode = await generateInviteCode();

    const newId = await IdGen.next(User, 'id', 6);

    const has_name = name
      ? name
      : randomUserInfo.firstName + ' ' + randomUserInfo.lastName;

    const has_email = email ? email : randomUserInfo.phone + '@gmail.com';

    const proxyRole = await Role.findOne({ name: '代理' });

    const price_pairs = await Package.find();

    const botUser = await BotUser.findById(id);

    // 检查该用户是否已经在任何机器人中绑定了代理
    const existingBotUserWithProxy = await BotUser.findOne({
      id: botUser.id,
      bound_proxy: { $exists: true, $ne: null },
    });

    if (existingBotUserWithProxy) {
      res.status(400);
      throw new Error('该用户已经拥有代理账户，无法重复生成');
    }

    const newUser = new User({
      ...req.body,
      id: newId,
      name: has_name,
      email: has_email,
      inviteCode,
      password: hashPassword,
      proxy: req.user._id,
      creator: req.user._id,
      roles: [proxyRole],
      price_pairs,
      plain_password: encrypt(password || randomUserInfo.password),
    });

    await newUser.save();

    console.log('newUser saved', newUser);

    const updatedbotUser = await BotUser.findByIdAndUpdate(id, {
      bound_proxy: newUser._id,
    }).exec();

    // 首先通过 BotUser 的 bots 字段或者通过 Application 记录来找到对应的机器人
    let botManager = await Bot.findOne({ botUsers: { $in: [botUser._id] } });

    if (!botManager) {
      // 如果通过 botUsers 找不到，尝试通过 Application 记录找到机器人
      const existingApplication = await Application.findOne({
        botUser: botUser._id,
      }).populate('bot');
      if (existingApplication && existingApplication.bot) {
        botManager = existingApplication.bot as any;
        console.log('通过 Application 找到机器人:', botManager._id);
      } else {
        console.error('无法找到对应的机器人');
        res.status(400);
        throw new Error('无法找到对应的机器人');
      }
    }

    const telegramBot = setupBot(botManager.token);

    try {
      await telegramBot.api.sendMessage(
        updatedbotUser.id,
        [
          `🎉 您的代理已生成！`,
          `\n`,
          `🔗 后台: <a>https://admin.trx-usdt.vip</a>`,
          ``,
          `👤 账号: <code>${newUser.email}</code>`,
          ``,
          `🔑 密码: <code>${password || randomUserInfo.password}</code>`,
          `\n`,
          // `⚡ 能量接收地址: <code>${newUser.energyReceiveAddress}</code>`,
        ].join('\n'),
        {
          parse_mode: 'HTML',
        },
      );
    } catch (error) {
      console.error('发送消息失败:', error);
      throw new Error('发送消息失败');
    }

    // 更新对应机器人的申请状态为已批准
    console.log('botManager:', botManager?._id);
    console.log('botUser._id:', botUser._id);

    // 先查找申请记录，如果没有指定机器人则查找任意待审批的申请
    let app = null;
    if (botManager) {
      app = await Application.findOneAndUpdate(
        {
          botUser: botUser._id,
          bot: botManager._id,
          status: 'pending',
        },
        {
          $set: {
            status: 'approved',
          },
        },
        { new: true },
      );
    }

    // 如果上面没找到，尝试找到任意一个待审批的申请记录
    if (!app) {
      app = await Application.findOneAndUpdate(
        {
          botUser: botUser._id,
          status: 'pending',
        },
        {
          $set: {
            status: 'approved',
          },
        },
        { new: true },
      );
    }

    console.log('Updated application:', app);

    if (!app) {
      console.error('未找到对应的待审批申请记录');
      // 查找所有相关的申请记录用于调试
      const allApplications = await Application.find({ botUser: botUser._id });
      console.log('该用户的所有申请记录:', allApplications);
    }

    res.json({
      success: true,
      data: updatedbotUser,
    });
  },
);

export const removeBoundProxy = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { id } = req.params;

    const updatedbotUser = await BotUser.findByIdAndUpdate(id, {
      bound_proxy: null,
    }).exec();

    await User.findOneAndDelete({ proxy: req.user._id }).exec();

    res.json({
      success: true,
      data: updatedbotUser,
    });
  },
);

export const rejectApplication = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const { id } = req.params;

    const { status, remark } = req.body;

    const botUser = await BotUser.findById(id);

    // 首先通过 BotUser 的 bots 字段或者通过 Application 记录来找到对应的机器人
    let botManager = await Bot.findOne({ botUsers: { $in: [botUser._id] } });

    if (!botManager) {
      // 如果通过 botUsers 找不到，尝试通过 Application 记录找到机器人
      const existingApplication = await Application.findOne({
        botUser: botUser._id,
      }).populate('bot');
      if (existingApplication && existingApplication.bot) {
        botManager = existingApplication.bot as any;
        console.log('通过 Application 找到机器人:', botManager._id);
      } else {
        console.error('无法找到对应的机器人');
        res.status(400);
        throw new Error('无法找到对应的机器人');
      }
    }

    const telegramBot = setupBot(botManager.token);

    try {
      await telegramBot.api.sendMessage(
        botUser.id,
        [`❌ 您的代理申请已被拒绝！`, ``, `📄 缘由: ${remark}`].join('\n'),
        {
          parse_mode: 'HTML',
        },
      );
    } catch (error) {
      console.error('发送消息失败:', error);
      throw new Error('发送消息失败');
    }

    const app = await Application.findOneAndUpdate(
      {
        botUser: botUser._id,
        bot: botManager._id,
      },
      {
        $set: {
          status,
          remark,
        },
      },
    );

    console.log('app', app);

    res.json({
      success: true,
    });
  },
);

export {
  getbotUsers,
  getbotUserById,
  addbotUser,
  updatebotUser,
  deletebotUser,
  deleteMultiplebotUsers,
};
