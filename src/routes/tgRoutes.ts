import { Router } from 'express';
import { enterPhone, enterCode } from '../controllers/tgController';

const router = Router();

/**
 * 路由：输入手机号
 * POST /api/tg/enterPhone
 */
router.post('/enterPhone', enterPhone);

/**
 * 路由：输入验证码
 * POST /api/tg/enterCode
 */
router.post('/enterCode', enterCode);

export default router;
