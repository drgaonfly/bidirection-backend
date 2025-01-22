import sizeOf from 'image-size';

/**
 * 获取图片的宽度和高度
 * @param imagePath 图片路径（可以是本地路径或 Buffer）
 * @returns 图片的宽度和高度
 */
export const getImageSize = async (
  imagePath: string | Buffer,
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    try {
      const dimensions = sizeOf(imagePath);
      if (dimensions.width && dimensions.height) {
        resolve({ width: dimensions.width, height: dimensions.height });
      } else {
        reject(new Error('无法获取图片尺寸'));
      }
    } catch (error) {
      reject(new Error(`读取图片尺寸失败: ${error.message}`));
    }
  });
};
