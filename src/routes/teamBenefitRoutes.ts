import express, { Router } from 'express';
import {
  getTeamBenefitById,
  updateTeamBenefit,
  deleteTeamBenefit,
  getTeamBenefitList,
  deleteMultipleTeamBenefit,
  addTeamBenefit,
  getAllTeamBenefit,
} from '../controllers/teamBenefitController';
import { protect, checkPermission } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router
  .route('/')
  .get(protect, checkPermission, getTeamBenefitList)
  .delete(protect, checkPermission, deleteMultipleTeamBenefit)
  .post(protect, checkPermission, addTeamBenefit);

router.route('/latest').get(getAllTeamBenefit);

router
  .route('/:id')
  .delete(protect, checkPermission, deleteTeamBenefit)
  .get(protect, checkPermission, getTeamBenefitById)
  .put(protect, checkPermission, updateTeamBenefit);

export default router;
