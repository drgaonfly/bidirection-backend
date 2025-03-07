import Setting from '../../models/setting';

// 定义需要更新的 key 列表
const UPDATABLE_KEYS = [
  'StakingApy',
  'incomePool',
  'revenuePool',
  'totalOutput',
  'validNodes',
  'participants',
  'userEarnings',
];

// 更新池子数值的函数
export const updatePoolValues = async (): Promise<void> => {
  try {
    // 只获取需要更新的设置项
    const settings = await Setting.find({
      key: { $in: UPDATABLE_KEYS },
    });

    for (const setting of settings) {
      const currentValue = parseFloat(setting.value);
      let newValue: number = currentValue;

      // 根据 key 应用不同的增长规则
      switch (setting.key) {
        case 'StakingApy':
          // 质押apy增长
          newValue = currentValue + currentValue * 0.002;
          break;
        case 'incomePool':
          // 玩家收入增长
          newValue = currentValue + currentValue * 0.0015;
          break;
        case 'revenuePool':
          // 收益池增长
          newValue = currentValue + 0.01;
          break;
        case 'totalOutput':
          // 总产出增长
          newValue = currentValue + currentValue * 0.001;
          break;
        case 'validNodes':
          // 有效节点增长或减少
          newValue = Math.random() < 0.5 ? currentValue + 1 : currentValue - 4;
          // 确保节点数不会小于0
          newValue = Math.max(0, newValue);
          break;
        case 'participants':
          // 参与人数增长
          newValue = currentValue + 2;
          break;
        case 'userEarnings':
          // 用户收益增长
          newValue = currentValue + currentValue * 0.0012;
          break;
      }

      // 更新设置值
      setting.value = newValue.toFixed(3); // 保留3位小数
      await setting.save();

      console.log(`Updated ${setting.key}:`, {
        parameter: setting.parameter,
        oldValue: currentValue,
        newValue: newValue,
      });
    }

    console.log('All values updated successfully');
  } catch (error) {
    console.error('Error updating values:', error);
  }
};
