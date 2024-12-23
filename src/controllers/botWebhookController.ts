import handleAsync from '../utils/handleAsync';
import { Request, Response } from 'express';

export const handleBotWebhook = handleAsync(
  async (req: Request, res: Response) => {
    // Handle the webhook
    console.log('Webhook received:', req.body);
    res.status(200).send('OK');
  },
);
