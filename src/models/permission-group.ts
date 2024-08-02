import mongoose, { Document } from 'mongoose';
import { IPermission } from './permission';

export interface IPermissionGroup extends Document {
  name: string;
  permissions: IPermission[];
  parent?: IPermissionGroup;
  parentId?: number;
  children: IPermissionGroup[];
  createdAt?: Date;
  updatedAt?: Date;
}

const permissionGroupSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'PermissionGroup' },
  parentId: { type: Number },
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PermissionGroup' }],
}, { timestamps: true });

const PermissionGroup = mongoose.model<IPermissionGroup>('PermissionGroup', permissionGroupSchema);

export default PermissionGroup;
