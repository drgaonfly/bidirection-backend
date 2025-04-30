import Chat from '../../models/chat';

export const clearInactiveChats = async (): Promise<void> => {
  try {
    console.log('开始清理客户为空的聊天记录');
    console.log('----------------------------------------------------');
    const now = new Date();
    console.log(
      `[当前时间] ${now.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
      })}`,
    );

    // 先填充所有聊天的customer字段
    const chats = await Chat.find().populate('customer').exec();

    // 统计删除的聊天数量
    let deletedCount = 0;

    // 更新相关用户的聊天状态
    for (const chat of chats) {
      // customer 为空的
      if (!chat.customer) {
        // 清理聊天记录
        await Chat.findByIdAndDelete(chat._id);
        console.log(`删除了无效聊天 ${chat._id}`);
        deletedCount++;
      }
    }

    console.log(`删除了 ${deletedCount} 个无效聊天`);

    console.log('----------------------------------------------------');
    console.log('聊天清理完成');
  } catch (error) {
    console.error('清理无效聊天时发生错误:', error);
  }
};
