import { Model, FilterQuery } from 'mongoose';

export class IdGen {
  static async next<T>(
    model: Model<T>,
    field: keyof T,
    padLength: number = 10,
  ): Promise<string> {
    console.log(
      `[IdGen] 开始生成新ID，字段: ${String(field)}，补零长度: ${padLength}`,
    );
    const sortQuery = { [field]: -1 } as any;
    const sortedDocs = await model.find().sort(sortQuery);
    console.log(`[IdGen] 共找到 ${sortedDocs.length} 条记录`);

    const validDocs = sortedDocs.filter(
      (doc) => !isNaN(Number((doc as any)[field])),
    );
    console.log(`[IdGen] 有效的数字ID记录数: ${validDocs.length}`);

    // 这里没有明显的语法问题，但如果 validDocs 里有很多数据，Math.max(...arr) 可能会因为参数过多导致栈溢出。
    // 更安全的写法如下，避免 ... 展开大数组：
    let maxNumber = 0;
    if (validDocs.length > 0) {
      maxNumber = Number((validDocs[0] as any)[field]);
      console.log(`[IdGen] 当前最大ID: ${maxNumber}`);
    } else {
      console.log(`[IdGen] 没有找到有效的ID，默认从0开始`);
    }

    let newId;
    let retry = 0;
    while (retry < 3) {
      newId = (maxNumber + 1).toString().padStart(padLength, '0');
      console.log(`[IdGen] 尝试生成新ID: ${newId} (第${retry + 1}次尝试)`);
      maxNumber++;
      const exists = await model.exists({ [field]: newId } as FilterQuery<T>);
      if (!exists) {
        console.log(`[IdGen] 新ID ${newId} 未被占用，生成成功`);
        return newId;
      } else {
        console.warn(`[IdGen] 新ID ${newId} 已存在，重试...`);
      }
      retry++;
    }
    console.error(`[IdGen] 生成ID失败，已重试3次`);
    throw new Error('生成ID失败，已重试3次');
  }
}
