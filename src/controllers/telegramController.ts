import { Request, Response } from 'express';
import { Api } from 'telegram';
import handleAsync from '../utils/handleAsync';
import TelegramClientInstance from '../utils/telegramClient';
import dotenv from 'dotenv';

dotenv.config();

// 发送验证码
export const sendAuthCode = handleAsync(async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    res.status(400);
    throw new Error('Phone number is required');
  }

  const client = await TelegramClientInstance.getInstance();

  const result = await client.invoke(
    new Api.auth.SendCode({
      phoneNumber: phoneNumber,
      apiId: parseInt(process.env.TELEGRAM_API_ID || '94575'),
      apiHash:
        process.env.TELEGRAM_API_HASH || 'a3406de8d171bb422bb6ddf3bbd800e2',
      settings: new Api.CodeSettings({
        allowFlashcall: true,
        currentNumber: true,
        allowAppHash: true,
        allowMissedCall: true,
        logoutTokens: [Buffer.from('arbitrary data here')],
      }),
    }),
  );

  res.json({
    success: true,
    data: result,
  });
});

// 验证码登录
export const signIn = handleAsync(async (req: Request, res: Response) => {
  const { phoneNumber, phoneCode, phoneCodeHash } = req.body;

  // 验证所有必需参数
  if (!phoneNumber || !phoneCode || !phoneCodeHash) {
    res.status(400);
    throw new Error(
      'Phone number, verification code, and code hash are required',
    );
  }

  const client = await TelegramClientInstance.getInstance();

  const signInResult = (await client.invoke(
    new Api.auth.SignIn({
      phoneNumber: phoneNumber,
      phoneCodeHash: phoneCodeHash,
      phoneCode: phoneCode,
    }),
  )) as Api.auth.TypeAuthorization;

  res.json({
    success: true,
    data: {
      result: signInResult,
    },
  });
});

export const login = handleAsync(async (req: Request, res: Response) => {
  const { phoneNumber, password, phoneCode } = req.body;

  // 验证必需参数
  if (!phoneNumber || !phoneCode) {
    res.status(400);
    throw new Error('Phone number and verification code are required');
  }

  const client = await TelegramClientInstance.getInstance();

  // 使用 start 方法进行登录
  await client.start({
    phoneNumber: async () => phoneNumber,
    password: async () => password,
    phoneCode: async () => phoneCode,
    onError: (err) => {
      throw new Error(err.message);
    },
  });

  res.json({
    success: true,
    data: {
      message: 'Login successful',
    },
  });
});
