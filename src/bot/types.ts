import { Context as GrammyContext } from 'grammy';
import { SessionData } from './sessions';
import { SessionFlavor } from 'grammy';
import { IBot } from '../models/bot';
import { IBotUser } from '../models/botUser';
import { IGroup } from '../models/group';

export interface CustomContext
  extends GrammyContext,
    SessionFlavor<SessionData> {}

export type MyContext = CustomContext & {
  currentBot?: IBot; // 当前机器人实例
  currentBotUser?: IBotUser; // 当前机器人用户
  currentGroup?: IGroup;
};
