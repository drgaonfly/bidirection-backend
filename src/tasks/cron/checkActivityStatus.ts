import Activity from '../../models/activity';

export const checkActivityStatus = async (): Promise<void> => {
  try {
    const now = new Date();

    // 查找所有状态不是 'ended' 的活动
    const activities = await Activity.find({
      status: { $ne: 'ended' },
    });

    console.log(`找到 ${activities.length} 个需要检查的活动`);

    // 检查每个活动是否过期
    for (const activity of activities) {
      // 计算活动持续时间（毫秒）
      const duration =
        activity.activityEndTime.getTime() - activity.createdAt.getTime();

      // 如果持续时间小于等于0或者当前时间已经超过了创建时间加上持续时间，则活动过期
      if (
        duration <= 0 ||
        now.getTime() >= activity.createdAt.getTime() + duration
      ) {
        console.log(`正在处理活动 ID: ${activity.id}`);
        console.log(`活动创建时间: ${activity.createdAt.toISOString()}`);
        console.log(`活动结束时间: ${activity.activityEndTime.toISOString()}`);
        console.log(`活动持续时间: ${duration / (1000 * 60 * 60 * 24)} 天`);
        console.log(`当前状态: ${activity.status}`);

        // 使用 findByIdAndUpdate 而不是直接修改和保存
        await Activity.findByIdAndUpdate(
          activity._id,
          { status: 'ended' },
          { new: true },
        );

        console.log(`活动 ${activity.id} 已更新为已结束状态`);
      }
    }

    const expiredCount = activities.filter(
      (activity) =>
        activity.activityEndTime.getTime() - activity.createdAt.getTime() <=
          0 ||
        now.getTime() >=
          activity.createdAt.getTime() +
            (activity.activityEndTime.getTime() - activity.createdAt.getTime()),
    ).length;

    if (expiredCount > 0) {
      console.log(`已更新 ${expiredCount} 个过期活动的状态为已结束`);
    }
  } catch (error) {
    console.error('检查活动状态时发生错误:', error);
  }
};
