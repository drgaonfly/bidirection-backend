import express from 'express';
import {
  createAssignment,
  getAllAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  deleteMultipleAssignments,
  findAvailableAccounts,
  findAvailableAccountsTest
} from '../controllers/accountAssignmentController'; // Adjust the import path as necessary
import { protect, allow } from '../middlewares/authMiddleware';
import { ROLES } from '../constants';

const router = express.Router();

// Define the routes for the Account Assignment operations
router.post('/', protect, allow([ROLES.Admin, ROLES.CustomerService, ROLES.OrderPlacer]), createAssignment);
router.get('/', protect, allow([ROLES.Admin]), getAllAssignments);
router.get('/:id', protect, allow([ROLES.Admin]), getAssignmentById);
router.put('/:id', protect, allow([ROLES.Admin]), updateAssignment);
router.delete('/:id', protect, allow([ROLES.Admin]), deleteAssignment);
router.delete('/', protect, allow([ROLES.Admin]), deleteMultipleAssignments);
router.post('/available', protect, allow([ROLES.OrderPlacer, ROLES.Admin, ROLES.CustomerService]), findAvailableAccounts);
router.post('/available-test', protect, allow([ROLES.OrderPlacer, ROLES.Admin, ROLES.CustomerService]), findAvailableAccountsTest);

export default router;