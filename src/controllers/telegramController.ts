import { Request, Response } from 'express';
import { Api, TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import handleAsync from '../utils/handleAsync';
import dotenv from 'dotenv';

dotenv.config();

const API_ID = process.env.TELEGRAM_API_ID || '94575';
const API_HASH =
  process.env.TELEGRAM_API_HASH || 'a3406de8d171bb422bb6ddf3bbd800e2';

// 发送验证码
const sendAuthCode = handleAsync(async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;

  try {
    const session = new StringSession('');
    const client = new TelegramClient(session, parseInt(API_ID), API_HASH, {});

    await client.connect();

    const result = await client.invoke(
      new Api.auth.SendCode({
        phoneNumber: phoneNumber,
        apiId: parseInt(API_ID),
        apiHash: API_HASH,
        settings: new Api.CodeSettings({
          allowFlashcall: true,
          currentNumber: true,
          allowAppHash: true,
          allowMissedCall: true,
        }),
      }),
    );

    await client.disconnect();

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500);
    throw new Error(`发送验证码失败: ${error.message}`);
  }
});

// 验证码登录
const signIn = handleAsync(async (req: Request, res: Response) => {
  const { phoneNumber, phoneCode } = req.body;

  try {
    const session = new StringSession('');
    const client = new TelegramClient(session, parseInt(API_ID), API_HASH, {});

    await client.connect();

    // 先请求电话号码验证码
    const sendCodeResult = await client.invoke(
      new Api.auth.SendCode({
        phoneNumber: phoneNumber,
        apiId: parseInt(API_ID),
        apiHash: API_HASH,
        settings: new Api.CodeSettings({
          allowFlashcall: true,
          currentNumber: true,
          allowAppHash: true,
          allowMissedCall: true,
        }),
      }),
    );

    // 使用收到的验证码进行登录
    const signInResult = await client.invoke(
      new Api.auth.SignIn({
        phoneNumber: phoneNumber,
        phoneCodeHash: (sendCodeResult as any).phone_code_hash, // 使用 phone_code_hash
        phoneCode: phoneCode,
      }),
    );

    // 获取会话字符串以供将来使用
    const sessionString = client.session.save();

    await client.disconnect();

    res.json({
      success: true,
      data: {
        session: sessionString,
        user: signInResult,
      },
    });
  } catch (error: any) {
    res.status(500);
    throw new Error(`登录失败: ${error.message}`);
  }
});

// 检查会话状态
const checkSession = handleAsync(async (req: Request, res: Response) => {
  const { session } = req.body;

  try {
    const client = new TelegramClient(
      new StringSession(session),
      parseInt(API_ID),
      API_HASH,
      {},
    );
    await client.connect();

    const isConnected = await client.isUserAuthorized();
    await client.disconnect();

    res.json({
      success: true,
      data: {
        isValid: isConnected,
      },
    });
  } catch (error: any) {
    res.status(500);
    throw new Error(`会话检查失败: ${error.message}`);
  }
});

// 退出登录
const logout = handleAsync(async (req: Request, res: Response) => {
  const { session } = req.body;

  try {
    const client = new TelegramClient(
      new StringSession(session),
      parseInt(API_ID),
      API_HASH,
      {},
    );
    await client.connect();

    await client.invoke(new Api.auth.LogOut());
    await client.disconnect();

    res.json({
      success: true,
      message: '退出登录成功',
    });
  } catch (error: any) {
    res.status(500);
    throw new Error(`退出登录失败: ${error.message}`);
  }
});

export { sendAuthCode, signIn, checkSession, logout };
