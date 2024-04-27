import express from 'express';
import {
  createAccountAssignmentRecord,
  getAllAccountAssignmentRecords,
  getAccountAssignmentRecordById,
  updateAccountAssignmentRecord,
  deleteAccountAssignmentRecord
} from '../controllers/accountAssignmentRecordController'; // Adjust the import path as necessary
import { protect, allow } from '../middlewares/authMiddleware';
import { ROLES } from '../constants';

const router = express.Router();

// Define the routes for the Account Assignment Record operations
router.post('/', protect, allow([ROLES.Customer, ROLES.Admin]), createAccountAssignmentRecord);
router.get('/', protect, allow([ROLES.Customer, ROLES.Admin]), getAllAccountAssignmentRecords);
router.get('/:id', protect, allow([ROLES.Customer, ROLES.Admin]), getAccountAssignmentRecordById);
router.put('/:id', protect, allow([ROLES.Customer, ROLES.Admin]), updateAccountAssignmentRecord);
router.delete('/:id', protect, allow([ROLES.Admin]), deleteAccountAssignmentRecord);

export default router;