import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import createDebug from 'debug';

const debug = createDebug('gram:bot');

const stringSession = ''; // leave this empty for now
// const BOT_TOKEN = process.env.BOT_TOKEN; // put your bot token here

// 从环境变量获取API凭证
const apiId = 1025907;
const apiHash = '452b0359b988148995f22ff0f4229750';

export const gramClient = new TelegramClient(
  new StringSession(stringSession),
  apiId,
  apiHash,
  { connectionRetries: 5 },
);

export async function startClientAndGetSession(token: string) {
  await gramClient.start({
    botAuthToken: token,
  });

  debug(gramClient.session.save());

  return gramClient.session.save();
}
