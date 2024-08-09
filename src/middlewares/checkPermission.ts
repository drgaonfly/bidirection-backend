import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/user'; // Adjust the import according to your file structure
import {IPermission} from '../models/permission';

const allowedPaths: string[] = ['path1', 'path2']; // Replace with your actual allowed paths

interface IRequest extends Request {
  user: IUser;
}

const checkPermission = asyncHandler(async (req: IRequest, res: Response, next: NextFunction) => {
  const { pageSize } = req.query as { pageSize?: string };

  if (pageSize && pageSize === "1000") {
    return next();
  }

  const path = req.baseUrl + req.route.path;
  const action = req.method;

  console.log('Checking path for permission', path);

  if (req.user.isAdmin) {
    return next();
  }

  if (allowedPaths.some((str) => path.startsWith(str))) {
    return next();
  }

  const roles = req.user.roles as { permissions: IPermission[] }[];

  if (roles.length === 0) {
    res.status(403);
    throw new Error('Access Denied');
  }

  const isAllowed = (permissions: IPermission[]) => {
    return permissions.some((permission) => {
      return permission.path === path && permission.action === action;
    });
  };

  if (
    roles.some(role =>
      isAllowed(role.permissions)
    )
  ) {
    next();
  } else {
    res.status(403);
    throw new Error('Access Denied');
  }
});

export default checkPermission;
function asyncHandler(_arg0: (req: IRequest, res: Response, next: NextFunction) => Promise<void>) {
  throw new Error('Function not implemented.');
}

