import express from 'express';
import {
  getConfig,
  saveConfig,
  uploadMedia,
  upload,
} from '../controllers/miniAppController';

const router = express.Router();

router.get('/config', getConfig);
router.post('/config', saveConfig);
router.post('/upload', upload.single('file'), uploadMedia);

export default router;
