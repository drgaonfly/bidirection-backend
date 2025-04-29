import express from 'express';
import {
  getOssCredentials,
  handleFileUpload,
  uploadFileToS3,
  getS3Credentials,
} from '../controllers/uploadController';
import { uploadFileToOSS } from '../controllers/uploadController';
import { protect } from '../middlewares/authMiddleware';
import { customerProtect } from '../middlewares/authMiddleware';

const router = express.Router();

if (process.env.FILE_STORAGE === 'aliyun') {
  router.post('/frontend', customerProtect, handleFileUpload, uploadFileToOSS);
  router.get('/get-credentials/frontend', customerProtect, getOssCredentials);
} else {
  router.post('/frontend', customerProtect, handleFileUpload, uploadFileToS3);
  router.get('/get-credentials/frontend', customerProtect, getS3Credentials);
}

if (process.env.FILE_STORAGE === 'aliyun') {
  router.post('/', protect, handleFileUpload, uploadFileToOSS);
  router.get('/get-credentials', protect, getOssCredentials);
} else {
  router.post('/', protect, handleFileUpload, uploadFileToS3);
  router.get('/get-credentials', protect, getS3Credentials);
}

export default router;
