import express, { Router } from 'express';
import {
  getUserById,
  updateUser,
  deleteUser,
  getUsers,
  deleteMultipleUsers,
  addUser,
  uploadUsers,
  uploadPrices,
} from '../controllers/userController';
import { protect, allow } from '../middlewares/authMiddleware';
import {ROLES} from "../constants";

const router: Router = express.Router();

router
  .route('/')
  .get(protect, allow([ROLES.SuperAdmin, ROLES.Admin]), getUsers)
  .delete(protect, allow(ROLES.SuperAdmin), deleteMultipleUsers)
  .post(protect, allow(ROLES.SuperAdmin), addUser);
 
router
  .route('/batch-upload')
  .post(protect, allow(ROLES.SuperAdmin), uploadUsers);  // Add this line

router
  .route('/:id')
  .delete(protect, allow(ROLES.SuperAdmin), deleteUser)
  .get(getUserById)
  .put(protect, allow(ROLES.SuperAdmin), updateUser);
router
  .route('/upload-prices')
  .post(protect, allow(ROLES.SuperAdmin), uploadPrices);
export default router;
