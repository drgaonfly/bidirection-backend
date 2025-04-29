import Customer from '../../models/customer';
import User from '../../models/user';

export const checkIsOnline = async (): Promise<void> => {
  try {
    console.log('开始检查在线状态');
    console.log('----------------------------------------------------');
    const now = new Date();
    console.log(
      `[当前时间] ${now.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
      })}`,
    );

    // 设置超时时间为5分钟
    const timeoutDuration = 5 * 60 * 1000; // 5分钟（毫秒）
    const timeoutThreshold = new Date(now.getTime() - timeoutDuration);

    // 使用 updateMany 批量更新客服和用户状态
    const customerResult = await Customer.updateMany(
      {
        lastOnline: { $lt: timeoutThreshold },
        isOn: true,
      },
      {
        isOn: false,
      },
    ).exec();

    const userResult = await User.updateMany(
      {
        lastOnline: { $lt: timeoutThreshold },
        isOn: true,
      },
      {
        isOn: false,
      },
    ).exec();

    console.log(`更新了 ${customerResult.modifiedCount} 个客服的在线状态`);
    console.log(`更新了 ${userResult.modifiedCount} 个用户的在线状态`);

    const totalUpdated =
      customerResult.modifiedCount + userResult.modifiedCount;
    if (totalUpdated > 0) {
      console.log(`总共更新了 ${totalUpdated} 个用户的在线状态`);
    }

    console.log('----------------------------------------------------');
    console.log('在线状态检查完成');
  } catch (error) {
    console.error('检查在线状态时发生错误:', error);
  }
};
