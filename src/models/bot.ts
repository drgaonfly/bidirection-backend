import mongoose, { Document } from 'mongoose';
import { IUser } from './user';
import { IBotUser } from './botUser';
import { IGroup } from './group';

export interface IBot extends Document {
  id: string;
  token: string;
  botName: string;
  userName: string;
  remark?: string;
  user: mongoose.Schema.Types.ObjectId | IUser;
  botUser: mongoose.Schema.Types.ObjectId | IBotUser;
  message: string;
  menus: IMenu[];
  keyboards: IKeyboard[];
  commands: ICommand[];
  isOnline: boolean;
  botUsers: mongoose.Schema.Types.ObjectId[] | IBotUser[];
  groups: mongoose.Schema.Types.ObjectId[] | IGroup[];
  owners: mongoose.Schema.Types.ObjectId[] | IBotUser[];
  authorized_users: mongoose.Schema.Types.ObjectId[] | IBotUser[];
  session?: string;
  contact?: string;
  trx20_address?: string;
  customer_service_link?: string;
  creator?: mongoose.Schema.Types.ObjectId | IBotUser;
  type?: 'public' | 'custom';
  clonedFrom?: mongoose.Schema.Types.ObjectId | IBot;
  canBeCloned?: boolean;
  fee: number;
  auto_exchange_address: string;
  private_key: string;
  exchange_rate: number;
  webhook_url: string;
  isCreatedByAdmin?: boolean;
  isExpired?: boolean;
  expireAt?: Date;
}

export interface IMenu extends Document {
  menuName: string;
  url: string;
}

export interface IKeyboard extends Document {
  command: string;
  content: string;
}

export interface ICommand extends Document {
  name: string;
  content: string;
  isStart: boolean;
  weight: number;
}

const menuSchema = new mongoose.Schema({
  menuName: { type: String, required: true },
  url: {
    type: String,
    required: true,
    validate: {
      validator: function (v: string): boolean {
        return /^(http|https):\/\/.*/.test(v);
      },
      message: (props: any): string => `${props.value} 不是一个有效的 URL!`,
    },
  },
});

const keyboardSchema = new mongoose.Schema({
  command: { type: String, required: true },
  content: { type: String, required: true },
});

const commandSchema = new mongoose.Schema({
  name: { type: String, required: true },
  content: { type: String, required: true },
  isStart: { type: Boolean, required: true },
  weight: { type: Number, required: true },
});

const botSchema = new mongoose.Schema(
  {
    id: { type: String, trim: true },
    token: { type: String, required: true, unique: true, trim: true },
    botName: { type: String, trim: true },
    userName: { type: String, trim: true },
    remark: { type: String, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    botUser: { type: mongoose.Schema.Types.ObjectId, ref: 'BotUser' },
    message: { type: String, trim: true },
    isOnline: { type: Boolean, default: true },
    botUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BotUser' }],
    owners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BotUser' }],
    authorized_users: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'BotUser' },
    ],
    menus: { type: [menuSchema], default: [] },
    keyboards: { type: [keyboardSchema], default: [] },
    commands: { type: [commandSchema], default: [] },
    session: { type: String, trim: true },
    contact: { type: String, trim: true },
    trx20_address: { type: String, trim: true },
    customer_service_link: { type: String, trim: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'BotUser' },
    type: { type: String, enum: ['public', 'custom'], default: 'custom' },
    clonedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bot',
      default: null,
    },
    canBeCloned: { type: Boolean, default: false },
    fee: { type: Number, default: 0 },
    auto_exchange_address: { type: String, trim: true },
    private_key: { type: String, trim: true, select: false },
    exchange_rate: { type: Number, default: 0 },
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
    webhook_url: { type: String, trim: true },
    isCreatedByAdmin: { type: Boolean, default: false },
    isExpired: { type: Boolean, default: false },
    expireAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const Bot = mongoose.model<IBot>('Bot', botSchema);

export default Bot;
