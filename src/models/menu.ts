import mongoose, { Document } from 'mongoose';
import { IPermission } from './permission';

export interface IMenu extends Document {
  name: string;
  path: string;
  icon?: string;
  parent?: IMenu;
  parentId?: number;
  children: IMenu[];
  permission: IPermission;
  permissionId: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const menuSchema = new mongoose.Schema({
  name: { type: String, required: true },
  path: { type: String, required: true },
  icon: { type: String },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu' },
  parentId: { type: Number },
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Menu' }],
  permission: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission' },
}, { timestamps: true });

const Menu = mongoose.model<IMenu>('Menu', menuSchema);

export default Menu;
