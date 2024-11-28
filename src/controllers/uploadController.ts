import { Request, Response } from 'express';
import multer from 'multer';
import handleAsync from '../utils/handleAsync';
import path from 'path';
import fs from 'fs';
import ossClient from '../utils/oss';
import { generateSignedUrlForOSS } from '../utils/generateSignedUrl';

export interface MulterFile extends Express.Multer.File {}

export interface CustomRequest extends Request {
  file: MulterFile;
}

// Configure multer to use disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '/tmp');
  },
  filename: function (req, file, cb) {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.floor(
      Math.random() * 1000,
    )}${fileExtension}`;
    cb(null, fileName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 200 },
});

export const handleFileUpload = upload.single('file');

export const uploadFileToOSS = handleAsync(
  async (req: CustomRequest, res: Response) => {
    const file = req.file;

    if (!file) {
      res.status(400);
      throw new Error('No file provided');
    }

    const filePath = file.path;
    const ossPath = `taskOssUploads/${file.filename}`;

    const fileContent = fs.readFileSync(filePath);
    await ossClient.put(ossPath, fileContent);
    fs.unlinkSync(filePath);

    const signedURL = await generateSignedUrlForOSS(ossPath);

    res.json({
      success: true,
      data: { signedURL, file: ossPath },
    });
  },
);

export const getOssCredentials = handleAsync(
  async (req: Request, res: Response) => {
    const policy = {
      conditions: [['content-length-range', 0, 1048576000]],
    };

    const result = (await ossClient.calculatePostSignature(policy)) as any;
    const host = `https://${process.env.OSS_BUCKET}.oss-cn-hongkong.aliyuncs.com`;

    res.json({
      accessId: process.env.OSS_ACCESS_KEY_ID,
      policy: result.policy,
      signature: result.Signature,
      host,
      dir: 'user-dir/',
    });
  },
);
