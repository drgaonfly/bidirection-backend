import {Request} from "express"
import {IRole} from "../models/role";

export interface RequestCustom extends Request
{
  role?: IRole;
}
