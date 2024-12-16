import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import dotenv from 'dotenv';

dotenv.config();

const API_ID = process.env.TELEGRAM_API_ID || '94575';
const API_HASH =
  process.env.TELEGRAM_API_HASH || 'a3406de8d171bb422bb6ddf3bbd800e2';

class TelegramClientInstance {
  private static instance: TelegramClient | null = null;

  private constructor() {}

  public static async getInstance(): Promise<TelegramClient> {
    if (!this.instance) {
      const session = new StringSession('');
      this.instance = new TelegramClient(session, parseInt(API_ID), API_HASH, {
        connectionRetries: 5,
      });
      await this.instance.connect();
    }
    return this.instance;
  }

  public static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.disconnect();
      this.instance = null;
    }
  }
}

export default TelegramClientInstance;
