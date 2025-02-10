import mongoose, { Document } from 'mongoose';
import { IPermission } from './permission';

export interface IMenu extends Document {
  name: string;
  path: string;
  icon?: string;
  parent: IMenu;
  permission: IPermission;
  createdAt?: Date;
  updatedAt?: Date;
  children: IMenu[];
  weight: number;
}

const menuSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    path: { type: String, required: true },
    icon: { type: String, required: false },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu' },
    permission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Permission',
      required: true,
    },
    weight: { type: Number, required: false, default: 0 },
  },
  { timestamps: true },
);

const Menu = mongoose.model<IMenu>('Menu', menuSchema);

export default Menu;
