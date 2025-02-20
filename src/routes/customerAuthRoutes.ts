import express, { Router } from 'express';
import {
  login,
  //   register,
  getCustomerProfile,
} from '../controllers/customerAuthController';
import { customerProtect } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router.route('/').post(login);
//   .post(register);

// 添加 protect 中间件进行身份验证
router.route('/profile').get(customerProtect, getCustomerProfile);

export default router;
