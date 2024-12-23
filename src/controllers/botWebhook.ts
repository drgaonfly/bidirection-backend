import handleAsync from '../utils/handleAsync';

export const handleBotWebhook = handleAsync(async (req, res) => {
  // Handle the webhook
  res.status(200).send('OK');
});
