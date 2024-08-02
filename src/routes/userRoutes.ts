import express, { Router } from 'express';
import {
  getUserById,
  updateUser,
  deleteUser,
  getUsers,
  deleteMultipleUsers,
  addUser,
} from '../controllers/userController';
import { protect } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, getUsers)
  .delete(protect, deleteMultipleUsers)
  .post(protect, addUser);

router
  .route('/:id')
  .delete(protect, deleteUser)
  .get(protect, getUserById)
  .put(protect, updateUser);

export default router;
