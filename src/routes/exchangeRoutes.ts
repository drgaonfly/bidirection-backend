import express, { Router } from 'express';
import { ethToUsdt, usdtToEth } from '../controllers/exchangeController';
import { customerProtect } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router.route('/ethToUsdt').post(customerProtect, ethToUsdt);

router.route('/usdtToEth').post(customerProtect, usdtToEth);

export default router;
