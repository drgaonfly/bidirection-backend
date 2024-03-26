import ossClient from "./oss";
import XLSX from 'xlsx';
import fs from 'fs';

export const processExcelFile = async (ossKey: string): Promise<string> => {
  // 从OSS下载文件
  const tempDownloadPath = `/tmp/${ossKey.split('/').pop()}`;
  await ossClient.get(ossKey, tempDownloadPath);

  // 使用xlsx读取文件
  const workbook = XLSX.readFile(tempDownloadPath);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // 添加新列
  const range = XLSX.utils.decode_range(worksheet['!ref']!);
  for (let C = range.e.c + 1; C <= range.e.c + 3; C++) {
    const address = XLSX.utils.encode_cell({r: 0, c: C}); // 第一行，新列
    worksheet[address] = {t: 's', v: `新列${C-range.e.c}`}; // 添加列名
  }
  range.e.c += 3; // 扩展范围以包含新列
  worksheet['!ref'] = XLSX.utils.encode_range(range);

  // 写回修改后的文件
  XLSX.writeFile(workbook, tempDownloadPath);

  // 上传修改后的文件到OSS
  const newOssKey = `modified-${ossKey}`;
  await ossClient.put(newOssKey, tempDownloadPath);

  // 清理临时文件
  fs.unlinkSync(tempDownloadPath);

  return newOssKey; // 返回新文件在OSS上的路径
};