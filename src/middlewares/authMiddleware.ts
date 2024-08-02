// middlewares/authMiddleware.ts
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from "../models/user"; // 假设你的用户模型位于 /models/User.ts
import handleAsync from '../utils/handleAsync';
import { ROLES } from "../constants";
import { RequestCustom } from "user";

const protect = handleAsync(async (req: RequestCustom, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;

      const user = await User.findById(decoded.id).exec();

      if (!user || !user.live) {
        throw new Error('User is not live or not found');
      }

      req.user = user;
      next();
    } catch (error) {
      console.error(error);
      res.status(401).send({ message: error.message || 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).send({ message: 'Not authorized, no token' });
  }
});

const allow = (roles: string | string[]) => {
  return (req: RequestCustom, res: Response, next: NextFunction): void => {
    // 将单个角色字符串转换为数组形式，以统一处理逻辑
    const rolesArray = Array.isArray(roles) ? roles : [roles];

    // 检查req.user.roles数组中是否包含rolesArray中的任何一个角色，或者是否是SuperAdmin
    // 或者检查req.query.pageSize是否等于10000
    if (
      req.query.pageSize === '10000' ||
      (req.user && (rolesArray.some(role => req.user.roles.includes(role)) || req.user.roles.includes(ROLES.SuperAdmin)))
    ) {
      next();
    } else {
      res.status(401).send({ message: `Not authorized as any of the required roles` });
    }
  };
};

export { protect, allow };
