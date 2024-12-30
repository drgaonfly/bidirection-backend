import express, { Router } from 'express';
import {
  getRecords,
  addRecord,
  getRecordById,
  updateRecord,
  deleteRecord,
  deleteMultipleRecords,
  submitNewbieTraining,
  getNewbieTraining,
} from '../controllers/recordController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getRecords)
  .post(protect, checkPermission, addRecord)
  .delete(protect, checkPermission, deleteMultipleRecords);

router
  .route('/:id')
  .get(protect, checkPermission, getRecordById)
  .put(protect, checkPermission, updateRecord)
  .delete(protect, checkPermission, deleteRecord);

router.get('/newbie-training', getNewbieTraining);
router.post('/submit-newbie-training', submitNewbieTraining);

export default router;
