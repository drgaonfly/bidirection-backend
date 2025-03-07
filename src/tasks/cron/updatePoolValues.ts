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

// 生成范围内的随机值
function getRandomValueInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// 更新池子数值的函数
export const updatePoolValues = async (): Promise<void> => {
  try {
    // 只获取需要更新的设置项
    const settings = await Setting.find({
      key: { $in: UPDATABLE_KEYS },
    });

    for (const setting of settings) {
      const currentValue = parseFloat(setting.value);
      const minValue = parseFloat(setting.minValue);
      const maxValue = parseFloat(setting.maxValue);

      // 直接在最大最小值范围内生成随机值
      const newValue = getRandomValueInRange(minValue, maxValue);

      // 更新设置值
      setting.value = newValue.toFixed(3);
      await setting.save();

      console.log(`Updated ${setting.key}:`, {
        parameter: setting.parameter,
        oldValue: currentValue,
        newValue: newValue,
        minValue: minValue,
        maxValue: maxValue,
      });
    }

    console.log('All values updated successfully');
  } catch (error) {
    console.error('Error updating values:', error);
  }
};
