import { Request } from 'express';
import { IBill } from '../models/bill';

export interface RequestCustom extends Request {
  bill?: IBill;
}
