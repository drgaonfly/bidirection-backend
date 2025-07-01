import express, { Router } from 'express';
import {
  getExchanges,
  getExchangeById,
  addExchange,
  updateExchange,
  deleteExchange,
  deleteMultipleExchanges,
} from '../controllers/exchangeController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getExchanges)
  .post(protect, checkPermission, addExchange)
  .delete(protect, checkPermission, deleteMultipleExchanges);

router
  .route('/:id')
  .get(protect, checkPermission, getExchangeById)
  .put(protect, checkPermission, updateExchange)
  .delete(protect, checkPermission, deleteExchange);

export default router;
