import mongoose, { Document } from 'mongoose';
import { IRole } from './role';
import { IPermissionGroup } from './permission-group';
import { IMenu } from './menu';

export interface IPermission extends Document {
  name: string;
  path: string;
  action: string;
  roles: IRole[];
  permissionGroup: IPermissionGroup;
  permissionGroupId: number;
  createdAt?: Date;
  updatedAt?: Date;
  menus: IMenu[];
}

const permissionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  path: { type: String, required: true },
  action: { type: String, required: true },
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
  permissionGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'PermissionGroup' },
  permissionGroupId: { type: Number, required: true },
  menus: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Menu' }],
}, { timestamps: true });

const Permission = mongoose.model<IPermission>('Permission', permissionSchema);

export default Permission;
