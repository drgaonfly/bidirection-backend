import { Bot, webhookCallback } from 'grammy';
import dotenv from 'dotenv';
import createDebug from 'debug';
import express from 'express';
import { setupBot } from './botSetup';

dotenv.config();

const bot = setupBot();

const development = async (bot: Bot) => {
  const debug = createDebug('bot:dev');
  console.log('Bot 正在运行于开发模式');
  const botInfo = await bot.api.getMe();
  debug('Bot Info:', botInfo);

  debug('Bot runs in development mode');
  debug(`${botInfo.username} deleting webhook`);
  await bot.api.deleteWebhook();
  debug(`${botInfo.username} starting polling`);

  await bot.start();
};

export const production = async (bot: Bot, app?: express.Express) => {
  const WEBHOOK_URL = process.env.WEBHOOK_URL;

  console.log('Bot 正在运行于生产模式');

  app.use('/webhook', webhookCallback(bot, 'express'));

  (async () => {
    await bot.api.setWebhook(WEBHOOK_URL);
    console.log(`Webhook 已设置为 ${WEBHOOK_URL}`);
  })();
};

export const startBot = async (bot: Bot, app?: express.Express) => {
  process.env.NODE_ENV === 'development'
    ? development(bot)
    : production(bot, app);
};

export default bot;
