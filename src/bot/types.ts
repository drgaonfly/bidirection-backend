import { Context as GrammyContext, SessionFlavor } from 'grammy';
import { IBot } from '../models/bot';
import { IBotUser } from '../models/botUser';
import { IGroup } from '../models/group';
import { IBotUserConfig } from '../models/botUserConfig';

// 直接在这里定义 SessionData，和 botSetup.ts 保持一致
export interface SessionData {
  awaitingCustomCharge?: boolean;
  // 你可以在这里添加更多 session 字段
}

export interface CustomContext
  extends GrammyContext,
    SessionFlavor<SessionData> {}

export type MyContext = CustomContext & {
  currentBot?: IBot; // 当前机器人实例
  currentBotUser?: IBotUser; // 当前机器人用户
  currentGroup?: IGroup;
  currentBotSession?: string;
  currentBotUserConfig?: IBotUserConfig;
  awaitingCustomCharge?: boolean;
};
