import { Composer } from 'grammy';
import { MyContext } from '../../types';
import createDebug from 'debug';
import BotUser, { IBotUser } from '../../../models/botUser';
import { IBot } from '../../../models/bot';

const addOperatorCommand = new Composer<MyContext>();

const debug = createDebug('bot:addOperator');

// 匹配 "设置操作人@机器人名 @用户" 格式的命令
addOperatorCommand.hears(/^设置操作人/, async (ctx) => {
  const currentGroup = ctx.currentGroup;
  const creator = ctx.currentGroup.creator as IBotUser;

  debug('当前用户ID:', ctx.currentBotUser._id);
  debug('创建者ID:', creator._id);

  if (ctx.currentBotUser._id.toString() !== creator._id.toString()) {
    await ctx.reply(
      `您不是当前权限人哦！此群机器人由 ${
        creator.userName ||
        `${creator.firstName || ''} ${creator.lastName || ''}`.trim()
      } 首次设置.`,
    );
    return;
  }

  debug(ctx.message.entities);
  const operators = ctx.message.entities.filter(
    (entity: any) => entity.user !== undefined,
  );

  debug('operators');
  debug(operators);

  // ctx.currentGroup.operators.push(...newOperators);
  // await ctx.currentGroup.save();

  // //   // 格式化回复消息
  // const operatorsList = filteredBotUsers.map((op) => `@${op}`).join(' ');
  // await ctx.reply(`已将 ${operatorsList} 设置为操作人`);
});

export default addOperatorCommand;
