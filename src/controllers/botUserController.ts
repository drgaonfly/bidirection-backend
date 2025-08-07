import { Request, Response } from 'express';
import BotUser from '../models/botUser'; // 引入botUser模型
import Bot from '../models/bot';
import Application from '../models/application';
import handleAsync from '../utils/handleAsync';
import { RequestCustom } from 'user';
import { isEmployee, isProxy } from '../middlewares/authMiddleware';
import { generateInviteCode } from './userController';
import bcrypt from 'bcrypt';
import User from '../models/user';
import Role from '../models/role';
import { IdGen } from '../utils/idGen';
import { getRandomUser } from '../services/ipGeoaddress';
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
    });

    await newUser.save();

    const updatedbotUser = await BotUser.findByIdAndUpdate(id, {
      bound_proxy: newUser._id,
    }).exec();

    const botUser = await BotUser.findById(id);

    const botManager = await Bot.findOne({ botUsers: { $in: id } });

    const telegramBot = setupBot(botManager.token);

    try {
      await telegramBot.api.sendMessage(
        botUser.id,
        [
          `🎉 您的代理已生成！`,
          `\n`,
          `🔗 后台: <a>https://admin.usudt.com/authorizations</a>`,
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

    const app = await Application.findOneAndUpdate(
      { botUser: botUser._id },
      {
        $set: {
          status: 'approved',
        },
      },
    );

    console.log('app', app);

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

    const botManager = await Bot.findOne({ botUsers: { $in: id } });

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
      { botUser: botUser._id },
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

//机器人发送消息
// const sendMessage = handleAsync(async (req: Request, res: Response) => {
//   const { id } = req.params;
//   const { message } = req.body;

//   if (!id) {
//     res.status(400);
//     throw new Error('用户ID不能为空');
//   }

//   if (!message) {
//     res.status(400);
//     throw new Error('消息内容不能为空');
//   }

//   // 查找 botUser 记录并关联 bot 信息
//   const botUser = await BotUser.findById(id)
//     .populate('bot')
//     .populate('messages');

//   if (!botUser) {
//     res.status(404);
//     throw new Error('未找到该用户与机器人的关联记录');
//   }

//   // 获取关联的 bot 实例
//   const bot = botUser.bot as IBot;

//   if (!bot.isOnline) {
//     res.status(400);
//     throw new Error('该机器人当前处于离线状态');
//   }

//   // 设置机器人实例
//   const telegramBot = setupBot(bot.token);

//   let messageType = 'received';

//   try {
//     // 发送消息
//     await telegramBot.api.sendMessage(botUser.id, message);
//   } catch (error) {
//     messageType = 'error';
//     console.error('发送消息失败:', error);
//     throw new Error('发送消息失败');
//   }

//   // 创建新消息
//   const newMessage = new BotUserMessage({
//     content: message,
//     type: messageType,
//     bot: bot._id,
//     botUser: botUser._id,
//   });
//   await newMessage.save();

//   botUser.messages.push(newMessage._id);
//   await botUser.save();

//   res.json({
//     success: true,
//     data: {
//       message: '消息发送成功',
//       botUser: botUser.userName,
//       content: message,
//       type: 'received',
//     },
//   });
// });

export {
  getbotUsers,
  getbotUserById,
  addbotUser,
  updatebotUser,
  deletebotUser,
  deleteMultiplebotUsers,
};
