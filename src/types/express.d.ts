import Request from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        name: string;
        // 可以添加其他用户属性
        id: string;
        email?: string;
      };
    }
  }
}
