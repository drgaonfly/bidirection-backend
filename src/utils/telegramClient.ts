import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import dotenv from 'dotenv';

dotenv.config();

const API_ID = process.env.TELEGRAM_API_ID || '94575';
const API_HASH =
  process.env.TELEGRAM_API_HASH || 'a3406de8d171bb422bb6ddf3bbd800e2';

const session = new StringSession('');
export const client = new TelegramClient(session, parseInt(API_ID), API_HASH, {
  connectionRetries: 5,
});

const telegramClient = async (): Promise<void> => {
  await client.connect();
  console.log('Telegram Client Connected');
};

export default telegramClient;
