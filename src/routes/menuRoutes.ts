import express, { Router } from 'express';
import {
  getMenus,
  getMenuById,
  addMenu,
  updateMenu,
  deleteMenu,
  deleteMultipleMenus,
  fetchMenus,
} from '../controllers/menuController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getMenus)
  .post(protect, checkPermission, addMenu)
  .delete(protect, checkPermission, deleteMultipleMenus);

router.get('/fetch', protect, fetchMenus);

router
  .route('/:id')
  .get(protect, checkPermission, getMenuById)
  .put(protect, checkPermission, updateMenu)
  .delete(protect, checkPermission, deleteMenu);

export default router;
