import express, { Router } from 'express';
import {
  getLiquidityBenefits,
  addLiquidityBenefit,
  getLiquidityBenefitById,
  updateLiquidityBenefit,
  deleteLiquidityBenefit,
  deleteMultipleLiquidityBenefits,
} from '../controllers/liquidityController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 前端获取流动性收益记录
router.route('/benefits').get(getLiquidityBenefits);

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
