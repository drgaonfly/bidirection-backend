import express, { Router } from 'express';
import {
  getLiquidityBenefits,
  addLiquidityBenefit,
  getLiquidityBenefitById,
  updateLiquidityBenefit,
  deleteLiquidityBenefit,
  deleteMultipleLiquidityBenefits,
  getCustomerLiquidityBenefits,
} from '../controllers/liquidityController';
import { protect, checkPermission } from '../middlewares/authMiddleware';
import { customerProtect } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 前端获取公共流动性收益率
router.route('/benefits').get(getLiquidityBenefits);

// 获取客户特定的流动性收益率
router
  .route('/customer-liquidity')
  .get(customerProtect, getCustomerLiquidityBenefits);

router
  .route('/')
  .get(protect, checkPermission, getLiquidityBenefits)
  .post(protect, checkPermission, addLiquidityBenefit)
  .delete(protect, checkPermission, deleteMultipleLiquidityBenefits);

router
  .route('/:id')
  .get(getLiquidityBenefitById)
  .put(protect, checkPermission, updateLiquidityBenefit)
  .delete(protect, checkPermission, deleteLiquidityBenefit);

export default router;
