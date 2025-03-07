import Setting from '../../models/setting';

// 更新池子数值的函数
export const updatePoolValues = async (): Promise<void> => {
  try {
    // 获取所有设置项
    const settings = await Setting.find();

    for (const setting of settings) {
      const currentValue = parseFloat(setting.value);
      let newValue: number = currentValue;

      // 根据 key 应用不同的增长规则
      switch (setting.key) {
        case 'StakingApy':
          // 	质押apy增长
          newValue = currentValue + currentValue * 0.002;
          break;
        case 'incomePool':
          // 	玩家收入增长
          newValue = currentValue + currentValue * 0.0015;
          break;
        case 'revenuePool':
          // 收益池增长
          newValue = currentValue + 0.01;
          break;
          // 其他 key 不进行增长
          continue;
      }

      // 更新设置值
      setting.value = newValue.toFixed(3); // 保留4位小数
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
