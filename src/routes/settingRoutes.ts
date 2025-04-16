import express, { Router } from 'express';
import {
  getSettings,
  getSettingById,
  addSetting,
  updateSetting,
  getSettingByKey,
  getCustomerAuthorizationSetting,
  getServiceLink,
  getStatistics,
} from '../controllers/settingController'; // 导入 settingController
import {
  protect,
  checkPermission,
  isAdmin,
} from '../middlewares/authMiddleware';
import { customerProtect } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 获取客户授权记时
router.get(
  '/customer-authorization',
  customerProtect,
  getCustomerAuthorizationSetting,
);

// 根据 key 获取设置
router.get('/key', getSettingByKey);

// Get statistics
router.get('/statistics', getStatistics);

// 获取服务链接
router.get('/service-link', customerProtect, getServiceLink);

// 批量路由处理
router
  .route('/')
  .get(protect, checkPermission, isAdmin, getSettings) // 获取设置项列表
  .post(protect, checkPermission, isAdmin, addSetting); // 添加新设置项

// 单个设置项路由处理
router
  .route('/:id')
  .get(protect, checkPermission, isAdmin, getSettingById) // 获取单个设置项
  .put(protect, checkPermission, isAdmin, updateSetting); // 更新设置项

export default router;
