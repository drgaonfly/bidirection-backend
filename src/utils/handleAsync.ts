import { Request, Response, NextFunction, RequestHandler } from 'express';

const handleAsync = (handler: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => handler(req, res, next).catch(next);
};

export default handleAsync;
