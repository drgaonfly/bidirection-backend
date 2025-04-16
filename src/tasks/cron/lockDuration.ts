import Activity from '../../models/activity';
import ReleaseRecord from '../../models/releaseRecord';
import { IActivity } from '../../models/activity';
import { Document } from 'mongoose';

interface ICustomer extends Document {
  _id: string;
  network: string;
  address: string;
}

interface IPopulatedActivity extends Omit<IActivity, 'customer'> {
  customer: ICustomer;
}

// 检查锁定时间并创建释放记录的函数
export async function checkLockDurationAndCreateRelease(): Promise<void> {
  try {
    console.log('开始检查锁定时间任务...');

    // 查找所有状态为 active 且已超过锁定时间的活动
    const expiredActivities = (await Activity.find({
      status: 'active',
      participateTime: {
        $lte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24小时前
      },
    }).populate('customer')) as IPopulatedActivity[];

    console.log(`找到 ${expiredActivities.length} 个过期活动需要处理`);

    for (const activity of expiredActivities) {
      // 计算锁定到期时间
      const lockEndTime = new Date(activity.participateTime);
      lockEndTime.setHours(lockEndTime.getHours() + activity.lockDuration * 24);

      console.log(`处理活动ID: ${activity._id}`);
      console.log(`锁定结束时间: ${lockEndTime}`);
      console.log(`当前时间: ${new Date()}`);

      // 如果当前时间超过锁定结束时间
      if (new Date() >= lockEndTime) {
        console.log(`活动 ${activity._id} 锁定期已到期，开始处理...`);

        // 更新活动状态
        activity.status = 'completed';
        await activity.save();
        console.log(`活动状态已更新为completed`);

        // 创建释放记录
        const releaseRecord = await ReleaseRecord.create({
          user: activity.user,
          customer: activity?.customer?._id,
          activity: activity._id,
          chainName: activity.customer.network,
          walletAddress: activity.customer.address,
          applyTime: new Date(),
          status: 'pending',
          stakedUsdt: activity.usdtAmount,
          rewardEth: activity.ethProfit,
          lockDays: activity.lockDuration,
          releaseTime: activity.activityEndTime,
        });
        console.log(`已创建释放记录，记录ID: ${releaseRecord._id}`);
      } else {
        console.log(`活动 ${activity._id} 仍在锁定期内，跳过处理`);
      }
    }

    console.log('锁定时间检查任务完成');
  } catch (error) {
    console.error('检查锁定时间任务出错:', error);
  }
}
