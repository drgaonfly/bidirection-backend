import Setting from '../../models/setting';

// 更新池子数值的函数
export const updatePoolValues = async (): Promise<void> => {
  try {
    console.log('开始更新数值...');
    console.log('-------------------------');
    // 获取所有设置项
    const settings = await Setting.find();
    console.log(`共找到 ${settings.length} 个需要更新的设置项`);

    for (const setting of settings) {
      const currentValue = parseFloat(setting.value);
      const minValue = setting.min;
      const maxValue = setting.max;
      let newValue: number = currentValue;

      // 根据 key 应用不同的增长规则
      switch (setting.key) {
        case 'StakingApy': {
          // 质押apy增长 - 在最小值和最大值之间取一个随机数，加到当前值上
          const randomValue = minValue + Math.random() * (maxValue - minValue);
          newValue = currentValue + randomValue;
          console.log(`正在处理质押APY，随机增长值: ${randomValue.toFixed(3)}`);
          break;
        }
        case 'incomePool': {
          // 玩家收入增长
          const randomValue = minValue + Math.random() * (maxValue - minValue);
          newValue = currentValue + randomValue;
          console.log(
            `正在处理玩家收入池，随机增长值: ${randomValue.toFixed(3)}`,
          );
          break;
        }
        case 'revenuePool': {
          // 收益池增长
          const randomValue = minValue + Math.random() * (maxValue - minValue);
          newValue = currentValue + randomValue;
          console.log(`正在处理收益池，随机增长值: ${randomValue.toFixed(3)}`);
          break;
        }
        case 'totalOutput': {
          // 总产出增长
          const randomValue = minValue + Math.random() * (maxValue - minValue);
          newValue = currentValue + randomValue;
          console.log(`正在处理总产出，随机增长值: ${randomValue.toFixed(3)}`);
          break;
        }
        case 'validNodes': {
          // 有效节点增长
          const randomValue = minValue + Math.random() * (maxValue - minValue);
          newValue = currentValue + randomValue;
          console.log(
            `正在处理有效节点数，随机增长值: ${randomValue.toFixed(3)}`,
          );
          break;
        }
        case 'participants':
          // 参与人数增长
          newValue = currentValue + 2;
          console.log(`正在处理参与人数，固定增长值: 2`);
          break;
        case 'userEarnings': {
          // 用户收益增长
          const randomValue = minValue + Math.random() * (maxValue - minValue);
          newValue = currentValue + randomValue;
          console.log(
            `正在处理用户收益，随机增长值: ${randomValue.toFixed(3)}`,
          );
          break;
        }
        default:
          // 其他 key 不进行任何操作
          console.log(`跳过未知参数更新: ${setting.key}`);
          continue;
      }

      // 只有在 key 匹配的情况下才更新设置值
      setting.value = newValue.toFixed(3); // 保留3位小数
      await setting.save();

      console.log(`更新完成 ${setting.key}:`, {
        参数名称: setting.parameter,
        原始值: currentValue,
        更新后的值: newValue,
        最小值: minValue,
        最大值: maxValue,
        增长值: newValue - currentValue,
      });
    }

    console.log('所有数值更新成功');
    console.log('-------------------------');
  } catch (error) {
    console.error('更新数值时发生错误:', error);
  }
};
