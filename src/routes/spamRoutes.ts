import express from 'express';
import { handleSpamRequest } from '../controllers/spamController';

const router = express.Router();

router.post('/spam', handleSpamRequest);

export default router;
