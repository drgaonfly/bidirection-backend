import BotModel from '../models/bot'; // 请确保路径正确

/**
 * 从数据库中生成机器人命令列表，仅包含 isStart 为 true 的，按 weight 升序排序
 */
export async function generateCommandsList(botToken: string): Promise<any[]> {
  const bot = await BotModel.findOne({ token: botToken }).lean();

  console.log('bot', bot);

  if (!bot || !Array.isArray(bot.commands)) {
    return [{ command: 'start', description: '启动机器人' }];
  }

  return bot.commands
    .filter((cmd) => cmd.isStart)
    .sort((a, b) => (a.weight || 0) - (b.weight || 0)) // 按 weight 升序排序
    .map((cmd) => ({
      command: cmd.name,
      description: cmd.content?.slice(0, 50) || '无描述',
    }));
}

export const commandsList = [
  { command: 'start', description: '开始' },
  { command: 'setup_topics', description: '配置话题模式（群组双向通信）' },
  { command: 'use_this_group', description: '将本群设为当前话题通信群组' },
];
