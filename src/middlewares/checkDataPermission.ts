import { Request, Response, NextFunction } from 'express';
import { IUser } from '../models/user'; // Adjust the import path as needed
import { IDataPermission } from '../models/dataPermission'; // Import IRole if needed
import { IRole } from '../models/role'

interface IRequest extends Request {
  user: IUser;
  getAllData?: boolean;
}

const checkDataPermission = asyncHandler(
  async (req: IRequest, res: Response, next: NextFunction) => {
    let path = req.baseUrl + req.route.path;

    if (path === "/api/projects/search") {
      path = "/api/projects/";
    }

    console.log('Checking path for data permission', path);

    if (req.user.isAdmin) {
      req.getAllData = true;
      return next();
    }

    const roles = req.user.roles as IRole[]; // Ensure roles are typed correctly

    if (roles.length === 0) {
      return next();
    }

    const isAllowed = (dataPermissions: IDataPermission[]): boolean => {
      return !!dataPermissions.find((dataPermission) => dataPermission.path === path);
    };

    if (
      roles.some(role =>
        isAllowed(
          role.dataPermissions
        )
      )
    ) {
      req.getAllData = true;
      next();
    } else {
      next();
    }
  }
);

function asyncHandler(
  fn: (req: IRequest, res: Response, next: NextFunction) => Promise<void>
) {
  return function (req: IRequest, res: Response, next: NextFunction) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}


export default checkDataPermission;