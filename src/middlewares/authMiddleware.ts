// middlewares/authMiddleware.ts
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from "../models/user"; // 假设你的用户模型位于 /models/User.ts
import handleAsync from '../utils/handleAsync';
import {ROLES} from "../constants";
import {RequestCustom} from "user";

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

const allow = (role: string) => {
  return (req: RequestCustom, res: Response, next: NextFunction): void => {
    console.log("req.user.role", req.user.role)
    if (req.user && (req.user.role === role || req.user.role === ROLES.SuperAdmin)) {
      next();
    } else {
      res.status(401).send({ message: `Not authorized as an ${role}` });
    }
  };
}

export { protect, allow };
