import { Request, Response } from 'express';

export const handleSpamRequest = async (req: Request, res: Response) => {
  const { phoneNumber, password, code } = req.body;

  // 这里可以添加处理逻辑，例如验证数据、存储到数据库等
  console.log('接收到的数据:', { phoneNumber, password, code });

  // 返回成功响应
  res
    .status(200)
    .json({ message: '请求成功', data: { phoneNumber, password, code } });
};
