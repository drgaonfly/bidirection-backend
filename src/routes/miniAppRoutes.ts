import express from 'express';
import { getConfig, saveConfig } from '../controllers/miniAppController';

const router = express.Router();

router.get('/config', getConfig);
router.post('/config', saveConfig);

export default router;
