import { Bot } from 'grammy';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { SocksProxyAgent } from 'socks-proxy-agent';

dotenv.config();

// 从环境变量中获取 BOT_TOKEN 和 SOCKS_PROXY_URL
const BOT_TOKEN = process.env.BOT_TOKEN; // 你的机器人令牌
const SOCKS_PROXY_URL = process.env.SOCKS_PROXY_URL; // SOCKS 代理 URL，例如 'socks5://username:password@host:port'

// 检查 BOT_TOKEN 是否存在
if (!BOT_TOKEN) {
  console.error('错误：未在环境变量中设置 BOT_TOKEN。');
  process.exit(1);
}

// 定义 bot 变量
let bot;

if (SOCKS_PROXY_URL) {
  // 创建 SOCKS 代理代理
  const agent = new SocksProxyAgent(SOCKS_PROXY_URL);

  // 自定义 fetch 函数，使用代理
  const customFetch = (url: string, options: any) => {
    return fetch(url, { agent, ...options });
  };

  // 使用自定义的 fetch 函数初始化 Bot
  bot = new Bot(BOT_TOKEN, {
    client: {
      fetch: customFetch,
    },
  });

  console.log('Bot 正在使用 SOCKS 代理：', SOCKS_PROXY_URL);
} else {
  // 未设置代理，正常初始化 Bot
  bot = new Bot(BOT_TOKEN);
  console.log('Bot 未使用代理。');
}

// 回复任何消息 "Hi there!"。
bot.on('message', (ctx) => ctx.reply('Hi there!'));

bot.start();
