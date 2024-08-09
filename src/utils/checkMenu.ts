import { IUser } from '../models/user';
import { IMenu } from '../models/menu';
import { IRole } from '../models/role';

const checkMenu = (menus: IMenu[], user: IUser): IMenu[] => {
  return menus.filter((menu) => {
    // 不再检查和递归处理 children 字段

    if (user.isAdmin) {
      return true;
    }

    const roles = user.roles;

    if (!roles) {
      return false;
    }

    return roles.some(
      (role: IRole) =>
        role.permissions &&
        role.permissions.some(
          (permission) => permission.id === menu.permission,
        ),
    );
  });
};

export default checkMenu;
