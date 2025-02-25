import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Customer from '../models/customer';
import { generateToken, generateRefreshToken } from '../utils/generateToken';
import handleAsync from '../utils/handleAsync';
import { RequestCustom } from 'user';
import { IdGen } from '../utils/idGen';
// import Redis from 'ioredis';
// import { IdGen } from '../utils/idGen';

// 创建 Redis 客户端实例

// const redis = new Redis({
//   host: process.env.REDIS_HOST,
//   port: Number(process.env.REDIS_PORT),
//   password: process.env.REDIS_PASSWORD,
//   db: Number(process.env.REDIS_DB),
// });

export const login = handleAsync(async (req: Request, res: Response) => {
  const { address, network } = req.body;

  // 获取当前IP地址
  const currentIP =
    req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown';

  let customer = await Customer.findOne({ address, network });

  if (!customer) {
    // 如果用户不存在，创建新用户
    const newId = await IdGen.next(Customer, 'id', 6);

    const newCustomer = new Customer({
      ...req.body,
      id: newId,
      createdAt: new Date(),
      logedinAt: new Date(),
      registerIP: currentIP,
      loginIP: currentIP,
    });

    customer = await newCustomer.save();
  } else {
    // 如果用户存在，更新登录信息
    customer.loginIP = currentIP;
    customer.logedinAt = new Date();
    await customer.save();
  }

  const refreshToken = generateRefreshToken(customer._id);

  res.json({
    user: customer.toObject(),
    jwt: generateToken(customer._id),
    refreshToken,
  });
});

interface DecodedToken {
  id: string;
}

export const refreshToken = handleAsync(async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401);
      throw new Error('You are not authenticated!');
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_JWT_SECRET as string,
    ) as DecodedToken;
    const newRefreshToken = generateRefreshToken(decoded.id);

    res.json({
      jwt: generateToken(decoded.id),
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    console.error(err);
    res.status(401);
    throw new Error(err.message || 'Not authorized, token failed');
  }
});

// export const register = handleAsync(async (req: Request, res: Response) => {
//   const { address, network } = req.body;

//   const customerExists = await Customer.findOne({ address, network });

//   if (customerExists) {
//     res.status(400);
//     throw new Error('Customer already exists');
//   }

//   // 生成用户 ID
//   const currentUserId = await IdGen.next(Customer, 'id');

//   const customer = await Customer.create({
//     id: currentUserId,
//     address,
//     network,
//     registerIP: req.ip,
//     createdAt: new Date(),
//     logedinAt: new Date(),
//   });

//   if (customer) {
//     const refreshToken = generateRefreshToken(customer._id);

//     res.status(201).json({
//       user: customer.toObject(),
//       jwt: generateToken(customer._id),
//       refreshToken,
//     });
//   } else {
//     res.status(400);
//     throw new Error('Invalid customer data');
//   }
// });

export const getCustomerProfile = handleAsync(
  async (req: RequestCustom, res: Response) => {
    const customerData = req.customer?.toObject();

    res.json({
      success: true,
      user: customerData,
    });
  },
);
