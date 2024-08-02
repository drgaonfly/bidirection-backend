import mongoose, { Document } from 'mongoose';
import { IRole } from './role';

export interface IDataPermission extends Document {
  name: string;
  path: string;
  roles: IRole[];
  createdAt?: Date;
  updatedAt?: Date;
}

const dataPermissionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  path: { type: String, required: true },
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
}, { timestamps: true });

const DataPermission = mongoose.model<IDataPermission>('DataPermission', dataPermissionSchema);

export default DataPermission;
