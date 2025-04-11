import ReleaseRecord from '../../models/releaseRecord';
import Customer from '../../models/customer';

export const checkReleaseRecords = async (): Promise<void> => {
  try {
    console.log(
      '----------------Checking release records...---------------------',
    );
    console.log(
      `---------------------------------------------------------------`,
    );
    const currentTime = new Date();
    console.log(
      `[当前时间] ${currentTime.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
      })}`,
    );

    // 获取所有状态为pending的记录
    const pendingRecords = await ReleaseRecord.find({ status: 'pending' });

    for (const record of pendingRecords) {
      // 计算是否到达解押时间
      const now = new Date();
      if (now >= record.releaseTime) {
        // 获取客户信息
        const customer = await Customer.findById(record.customer);

        if (!customer) {
          console.error(`Customer not found for record ${record._id}`);
          continue;
        }

        // 计算更新后的USDT质押余额
        const newUsdtStaking = customer.usdtStaking - record.stakedUsdt;

        // 如果更新后的余额为负数，说明余额不足
        if (newUsdtStaking < 0) {
          // 将状态更新为refused
          await ReleaseRecord.findByIdAndUpdate(record._id, {
            status: 'refused',
          });
          console.log(
            `Release record ${record._id} marked as refused due to insufficient balance`,
          );
        } else {
          // 更新客户余额
          await Customer.findByIdAndUpdate(customer._id, {
            $inc: {
              usdtStaking: -record.stakedUsdt,
              ethPlatform: record.rewardEth,
            },
          });

          // 更新解押记录状态为success
          await ReleaseRecord.findByIdAndUpdate(record._id, {
            status: 'success',
          });
          console.log(`Release record ${record._id} processed successfully`);
        }
      }
    }
    console.log(
      `---------------------------------------------------------------`,
    );
    console.log(
      '---------------------Release records checked---------------------\n',
    );
  } catch (error) {
    console.error('Error in checkReleaseRecords:', error);
  }
};
