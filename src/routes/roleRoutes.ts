import express, { Router } from 'express';
import {
  getRoles,
  getRoleById,
  addRole,
  updateRole,
  deleteRole,
  deleteMultipleRoles,
} from '../controllers/roleController';
import { protect } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// 获取所有角色、添加新角色和批量删除角色
router
  .route('/')
  .get(protect, getRoles)
  .post(protect, addRole)
  .delete(protect, deleteMultipleRoles);

// 根据 ID 获取、更新和删除角色
router
  .route('/:id')
  .get(protect, getRoleById)
  .put(protect, updateRole)
  .delete(protect, deleteRole);

export default router;
