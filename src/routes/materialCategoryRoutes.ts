import express, { Router } from 'express';
import {
  deleteMultipleMaterialCategories,
  updateMaterialCategory,
  deleteMaterialCategory,
  getMaterialCategories,
  addMaterialCategory,
  getMaterialCategoryById,
} from '../controllers/materialCategoryController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

// GET and POST requests for all material categories
router
  .route('/')
  .get(protect, checkPermission, getMaterialCategories)
  .post(protect, checkPermission, addMaterialCategory);

// DELETE request for multiple material categories
// Assuming you have a way to specify multiple IDs in the request body
router
  .route('/')
  .delete(protect, checkPermission, deleteMultipleMaterialCategories);

// GET, PUT, and DELETE requests for a single material category
router
  .route('/:id')
  .get(protect, checkPermission, getMaterialCategoryById)
  .put(protect, checkPermission, updateMaterialCategory)
  .delete(protect, checkPermission, deleteMaterialCategory); // Corrected to use deleteMaterialCategory here

export default router;
