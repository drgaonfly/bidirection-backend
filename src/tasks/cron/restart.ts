import Group from '../../models/group';

export const ResetStartAtOfGroup = async (): Promise<void> => {
  try {
    console.log('开始重置开始时间');
    console.log('----------------------------------------------------');
    const now = new Date();
    console.log(
      `[当前时间] ${now.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
      })}`,
    );

    // 清空所有群组的startAt字段
    await Group.updateMany({}, { $unset: { startAt: '' } }).exec();

    console.log('----------------------------------------------------');
    console.log('状态重置完成');
  } catch (error) {
    console.error('重置时间时发生错误:', error);
  }
};
