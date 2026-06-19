import { Middleware } from 'grammy';
import Group from '../../models/group';
import { MyContext } from '../types';
import createDebug from 'debug';
import { refreshTopicSetupState } from '../services/topicService';

const debug = createDebug('bot:group');

const groupResolver: Middleware<MyContext> = async (ctx, next) => {
  // 处理群组升级为 supergroup 的迁移事件
  if (ctx.message?.migrate_to_chat_id) {
    const oldId = ctx.chat.id;
    const newId = ctx.message.migrate_to_chat_id;
    debug('群组迁移: %d → %d', oldId, newId);

    try {
      const oldGroup = await Group.findOne({ id: oldId });
      const newGroup = await Group.findOne({ id: newId });

      if (oldGroup && newGroup) {
        // 两条记录都存在，把旧记录的 botUserTopics 合并到新记录，然后删旧记录
        await Group.findByIdAndUpdate(newGroup._id, {
          $set: {
            topicMode: oldGroup.topicMode || newGroup.topicMode,
            setupStep: Math.max(
              oldGroup.setupStep ?? 0,
              newGroup.setupStep ?? 0,
            ),
            canManageTopics:
              oldGroup.canManageTopics || newGroup.canManageTopics,
          },
          $addToSet: {
            botUsers: { $each: oldGroup.botUsers ?? [] },
            botUserTopics: { $each: oldGroup.botUserTopics ?? [] },
          },
        });
        await Group.findByIdAndDelete(oldGroup._id);
        debug('已合并旧记录到新 supergroup 记录，旧记录已删除');
      } else if (oldGroup) {
        // 只有旧记录，直接更新 id
        await Group.findByIdAndUpdate(oldGroup._id, { id: newId });
        debug('已更新群组 id: %d → %d', oldId, newId);
      }
    } catch (err) {
      debug('群组迁移处理失败:', err);
    }

    ctx.currentGroup = null;
    return await next();
  }
  if (!ctx.chat || ctx.chat.type === 'private') {
    debug('请在群组中使用此命令');
    ctx.currentGroup = null;
    return await next();
  }

  const chatId = ctx.chat.id;

  // 查询数据库中的群组信息
  const currentGroup = await Group.findOne({
    id: chatId,
  }).populate(['bot', 'creator', 'operators']);

  // 打印群组信息
  debug('Group info:', {
    id: ctx.chat.id,
    title: ctx.chat.title,
    type: ctx.chat.type,
  });

  if (!currentGroup) {
    // 如果群组不存在，创建新群组记录
    const newGroup = new Group({
      id: chatId,
      title: ctx.chat.title,
      type: ctx.chat.type,
      bot: ctx.currentBot._id, // 假设botResolver中间件已经运行并设置了currentBot
      creator: ctx.currentBotUser._id, // 假设已有用户记录
      exchange_rate: 1,
      fee_rate: 0,
    });

    await newGroup.save();
    ctx.currentGroup = newGroup;

    await ctx.reply('感谢您把我添加到贵群!');
  } else {
    // 更新群组信息
    // 只在群组标题或类型发生变化时才更新
    if (
      currentGroup.title !== ctx.chat.title ||
      currentGroup.type !== ctx.chat.type
    ) {
      currentGroup.title = ctx.chat.title;
      currentGroup.type = ctx.chat.type;
      await currentGroup.save();
    }

    ctx.currentGroup = currentGroup;
  }

  // 使用 $addToSet 将当前用户添加到群组的用户列表中，避免重复添加
  await Group.updateOne(
    { _id: ctx.currentGroup._id },
    { $addToSet: { botUsers: ctx.currentBotUser._id } },
  );

  await ctx.currentBot.updateOne({
    $addToSet: { groups: ctx.currentGroup._id },
  });

  debug('Added user to group botUsers:', ctx.currentBotUser._id);

  // ── 话题模式：周期性刷新配置状态（每次有消息时都检查，成本低）
  // 只对非母机器人、且群组尚未完成配置（setupStep < 4）时才刷新
  if (!ctx.currentBot.isCreatedByAdmin && ctx.currentGroup.setupStep < 4) {
    try {
      const botInfo = await ctx.api.getMe();
      await refreshTopicSetupState(
        ctx.api,
        ctx.currentGroup,
        botInfo.id,
        ctx.currentBot._id,
      );
      debug('话题配置状态已刷新, step=%d', ctx.currentGroup.setupStep);
    } catch (err) {
      debug('刷新话题配置状态失败:', err);
    }
  }

  // 继续处理后续中间件
  await next();
};

export default groupResolver;
