import express, { Router } from 'express';
import {
  getMiningOutputList,
  deleteMultipleMiningOutput,
  addMiningOutput,
  getMiningOutputById,
  updateMiningOutput,
  deleteMiningOutput,
  getRandomMiningOutput,
} from '../controllers/miningOutputController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(getMiningOutputList)
  .delete(protect, checkPermission, deleteMultipleMiningOutput)
  .post(addMiningOutput);

router.get('/random', getRandomMiningOutput);

router
  .route('/:id')
  .delete(protect, checkPermission, deleteMiningOutput)
  .get(protect, getMiningOutputById)
  .put(protect, checkPermission, updateMiningOutput);

export default router;
