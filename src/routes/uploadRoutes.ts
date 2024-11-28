import express from 'express';
import {
  getOssCredentials,
  handleFileUpload,
  uploadFileToOSS,
} from '../controllers/uploadController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// 添加调试中间件
router.use((req, res, next) => {
  console.log('Request received in uploadRoutes:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    headers: req.headers,
  });
  next();
});

router.post('/', protect, handleFileUpload, uploadFileToOSS);
router.post('/get-oss-credentials', protect, (req, res, next) => {
  console.log('Accessing get-oss-credentials endpoint');
  getOssCredentials(req, res, next);
});

export default router;
