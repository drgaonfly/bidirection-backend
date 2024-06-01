import express from 'express';
import {
  createAccountAssignmentRecord,
  getAllAccountAssignmentRecords,
  getAccountAssignmentRecordById,
  updateAccountAssignmentRecord,
  deleteAccountAssignmentRecord,
  exportAccountAssignmentRecordsToExcel,
  deleteMultipleAssignmentRecords
} from '../controllers/accountAssignmentRecordController'; // Adjust the import path as necessary
import { protect, allow } from '../middlewares/authMiddleware';
import { ROLES } from '../constants';

const router = express.Router();

// Define the routes for the Account Assignment Record operations
router.post('/', protect, allow([ROLES.Customer, ROLES.Admin]), createAccountAssignmentRecord);
router.get('/', protect, allow([ROLES.Customer, ROLES.Admin]), getAllAccountAssignmentRecords);
router.get('/export', protect, allow([ROLES.Admin]), exportAccountAssignmentRecordsToExcel);
router.get('/:id', protect, allow([ROLES.Customer, ROLES.Admin]), getAccountAssignmentRecordById);
router.put('/:id', protect, allow([ROLES.Customer, ROLES.Admin]), updateAccountAssignmentRecord);
router.delete('/:id', protect, allow([ROLES.Admin]), deleteAccountAssignmentRecord);
router.delete('/', protect, allow([ROLES.Admin]), deleteMultipleAssignmentRecords);

export default router;