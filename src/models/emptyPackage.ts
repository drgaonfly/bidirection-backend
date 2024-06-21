import mongoose, { Document } from 'mongoose';
import { IUser } from './user';

// TypeScript interface for EmptyPackage
export interface IEmptyPackage extends Document {
  file: string;
  country: string;  // Country associated with the empty package
  platform: string;  // Platform the empty package is posted on
  quantity: number;  // Number of empty packages
  user: mongoose.Schema.Types.ObjectId | IUser;  // Reference to the User model
  createdAt?: Date; // Time of document creation
  updatedAt?: Date; // Time the document was last updated
  isProcessed: boolean;  // Whether the package has been processed
  uploadTime: string;
  code: string;
  note?: string;  // 备注
}

// Mongoose schema definition for EmptyPackage
const emptyPackageSchema = new mongoose.Schema<IEmptyPackage>({
  isProcessed: {
    type: Boolean,
    required: true,
    default: false  // Initially, packages are not processed
  },
  file: {
    type: String,
    required: false,  // Not every empty package may have a PDF
    trim: true
  },
  country: {
    type: String,
    required: true,
    trim: true
  },
  platform: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'  // Assuming a User model exists
  },
  note: {
    type: String,
    required: false,
    trim: true
  },
  uploadTime: { type: String, required: true }, // 新增上传时间字段
  code: { type: String, required: true },
}, { timestamps: true });

// Mongoose model for EmptyPackage
const EmptyPackage = mongoose.model<IEmptyPackage>('EmptyPackage', emptyPackageSchema);

export default EmptyPackage;
