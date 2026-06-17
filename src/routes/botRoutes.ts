import express, { Router } from 'express';
import {
  getBots,
  getBotById,
  addBot,
  updateBot,
  deleteBot,
  deleteMultipleBots,
  addOwner,
  delOwner,
  sendMessage,
  sendGroupMessage,
  addTronAddress,
} from '../controllers/botController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router.route('/:id/tron-address').put(protect, checkPermission, addTronAddress);

router
  .route('/')
  .get(protect, checkPermission, getBots)
  .post(protect, checkPermission, addBot)
  .delete(protect, checkPermission, deleteMultipleBots);

router
  .route('/:id')
  .get(protect, checkPermission, getBotById)
  .put(protect, checkPermission, updateBot)
  .delete(protect, checkPermission, deleteBot);

router.route('/:id/add-owner').put(protect, checkPermission, addOwner);

router.route('/:id/delete-owner').put(protect, checkPermission, delOwner);

router.route('/:id/send-message').post(protect, checkPermission, sendMessage);

router
  .route('/:id/send-group-message')
  .put(protect, checkPermission, sendGroupMessage);

export default router;
