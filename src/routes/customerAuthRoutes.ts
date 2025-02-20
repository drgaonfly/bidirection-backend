import express, { Router } from 'express';
import {
  login,
  //   register,
  getCustomerProfile,
} from '../controllers/customerAuthController';
// import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router.route('/').post(login);
//   .post(register);

router.route('/:id').get(getCustomerProfile);

export default router;
