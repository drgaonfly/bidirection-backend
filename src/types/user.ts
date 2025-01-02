import { Request } from 'express';
import { IUser } from '../models/user';

export interface RequestCustom extends Request {
  getAllData?: boolean;
  user?: IUser;
}
