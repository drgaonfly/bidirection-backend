import Bot from '../../models/bot';
import BotUser from '../../models/botUser';
import { MyContext } from '../types';

export const findBotAndUser = async (ctx: MyContext) => {
  let bot = ctx.currentBot;
  let botUser = ctx.currentBotUser;

  if (!botUser) {
    botUser = await BotUser.findOne({
      id: ctx.update.callback_query.from.id.toString(),
    });
  }

  if (!bot) {
    bot = await Bot.findOne({ id: ctx.me.id.toString() });
  }

  return { bot, botUser };
};
