import express from 'express';
import { createTask, getAllTasks, getTaskById, updateTask, deleteTask, deleteMultipleTasks } from '../controllers/taskController'; // Adjust the import path as necessary
import { allow, protect } from '../middlewares/authMiddleware';
import { ROLES } from '../constants';

const router = express.Router();

router.post('/', protect, allow(ROLES.Customer), createTask);
router.get('/', protect, allow(ROLES.Customer), getAllTasks);
router.get('/:id', protect, allow(ROLES.Customer), getTaskById);
router.put('/:id', protect, allow(ROLES.Customer), updateTask);
router.delete('/:id', protect, allow(ROLES.Customer), deleteTask);
router.delete('/', protect, allow(ROLES.Customer), deleteMultipleTasks);

export default router;