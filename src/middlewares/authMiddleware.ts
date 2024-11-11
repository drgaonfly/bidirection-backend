// middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/user';
import { IPermission } from '../models/permission';
import handleAsync from '../utils/handleAsync';
import { ROLES } from '../constants';
import { RequestCustom } from 'user';
import { IDataPermission } from '../models/dataPermission';
import { IRole } from '../models/role';

const allowedPaths: string[] = ['/api/', 'path2']; // Replace with your actual allowed paths

interface IRequest extends Request {
  user: IUser;
  getAllData?: boolean;
}

const protect = handleAsync(
  async (req: RequestCustom, res: Response, next: NextFunction) => {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      try {
        token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET as string,
        ) as jwt.JwtPayload;

        const user: IUser | null = await User.findById(decoded.id)
          .populate({
            path: 'roles',
            populate: {
              path: 'permissions',
              model: 'Permission',
            },
          })
          .exec();

        if (!user || !user.live) {
          throw new Error('User is not live or not found');
        }

        req.user = user;
        console.log('User is', user);
        next();
      } catch (error) {
        console.error(error);
        res
          .status(401)
          .send({ message: error.message || 'Not authorized, token failed' });
      }
    }

    if (!token) {
      res.status(401).send({ message: 'Not authorized, no token' });
    }
  },
);

const allow = (roles: string | string[]) => {
  return (req: RequestCustom, res: Response, next: NextFunction): void => {
    // 将单个角色字符串转换为数组形式，以统一处理逻辑
    const rolesArray = Array.isArray(roles) ? roles : [roles];

    // 检查req.user.roles数组中是否包含rolesArray中的任何一个角色，或者是否是SuperAdmin
    // 或者检查req.query.pageSize是否等于10000
    if (
      req.query.pageSize === '10000' ||
      (req.user &&
        (rolesArray.some((role) => req.user.roles.includes(role)) ||
          req.user.roles.includes(ROLES.SuperAdmin)))
    ) {
      next();
    } else {
      res
        .status(401)
        .send({ message: `Not authorized as any of the required roles` });
    }
  };
};

const checkPermission = handleAsync(
  async (req: IRequest, res: Response, next: NextFunction) => {
    const { pageSize } = req.query as { pageSize?: string };

    if (pageSize && pageSize === '10000') {
      return next();
    }

    const path = req.baseUrl + req.route.path;
    const action = req.method;

    console.log('Checking path for permission', path);

    if (req.user.isAdmin) {
      return next();
    }

    if (allowedPaths.some((str) => path.startsWith(str))) {
      return next();
    }

    const roles = req.user.roles as { permissions: IPermission[] }[];

    if (roles.length === 0) {
      res.status(403);
      throw new Error('Access Denied');
    }

    const isAllowed = (permissions: IPermission[]) => {
      return permissions.some((permission) => {
        return permission.path === path && permission.action === action;
      });
    };

    if (roles.some((role) => isAllowed(role.permissions))) {
      next();
    } else {
      res.status(403);
      throw new Error('Access Denied');
    }
  },
);

const checkDataPermission = handleAsync(
  async (req: IRequest, res: Response, next: NextFunction) => {
    let path = req.baseUrl + req.route.path;

    if (path === '/api/projects/search') {
      path = '/api/projects/';
    }

    console.log('Checking path for data permission', path);

    if (req.user.isAdmin) {
      req.getAllData = true;
      return next();
    }

    const roles = req.user.roles as IRole[]; // Ensure roles are typed correctly

    if (roles.length === 0) {
      return next();
    }

    const isAllowed = (dataPermissions: IDataPermission[]): boolean => {
      return !!dataPermissions.find(
        (dataPermission) => dataPermission.path === path,
      );
    };

    if (roles.some((role) => isAllowed(role.dataPermissions))) {
      req.getAllData = true;
      next();
    } else {
      next();
    }
  },
);

const appDatabase = {
  pvMgE78ym6: 'KP7aBBj2j62Jupw1YbWgh4woXRkgkWPp',
};
// 验证 access_token 的中间件
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const appId = req.headers['x-app-id'] as string;
  const timestamp = req.headers['x-timestamp'] as string;
  const accessToken = req.headers['authorization']?.split(' ')[1];
  if (!appId || !timestamp || !accessToken) {
    return res.status(400).json({ error: 'Missing authentication parameters' });
  }
  // 假设appDatabase是一个全局变量，或者是一个在其他地方定义的变量
  // 如果appDatabase未定义，则需要在这里定义它，或者确保它在这个文件的作用域内可访问
  // 以下代码假设appDatabase是一个对象，用于存储应用程序的密钥
  const appSecret = appDatabase[appId as keyof typeof appDatabase];
  if (!appSecret) {
    return res.status(401).json({ error: 'Invalid app_id' });
  }
  // 生成后端的 token
  const data = `${appId}:${timestamp}`;
  const serverAccessToken = require('crypto')
    .createHmac('sha256', appSecret)
    .update(data)
    .digest('hex');
  // 验证 access_token 是否匹配
  if (accessToken !== serverAccessToken) {
    return res.status(401).json({ error: 'Invalid access_token' });
  }
  // 可选：检查时间戳，确保请求未过期
  const requestTime = parseInt(timestamp);
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime - requestTime > 300) {
    // 例如 5 分钟
    return res.status(401).json({ error: 'Token expired' });
  }
  next();
};

export {
  protect,
  allow,
  checkPermission,
  checkDataPermission,
  authenticateToken,
};
