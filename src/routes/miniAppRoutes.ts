import express from 'express';
import {
  getConfig,
  saveConfig,
  uploadMedia,
  upload,
  getAutoReplies,
  saveAutoReplies,
} from '../controllers/miniAppController';

const router = express.Router();

router.get('/config', getConfig);
router.post('/config', saveConfig);
router.post('/upload', upload.single('file'), uploadMedia);
router.get('/auto-replies', getAutoReplies);
router.post('/auto-replies', saveAutoReplies);

export default router;
