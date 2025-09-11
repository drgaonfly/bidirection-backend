import mongoose, { Document } from 'mongoose';
import { IUser } from './user';
import { IBotUser } from './botUser';
import { IGroup } from './group';

export interface IBot extends Document {
  id: string;
  token: string;
  botName: string;
  remark?: string;
  user: mongoose.Schema.Types.ObjectId | IUser;
  message: string;
  userName: string;
  menus: IMenu[];
  keyboards: IKeyboard[];
  commands: ICommand[];
  price_pairs: IPricePair[];
  isOnline: boolean;
  botUsers: mongoose.Schema.Types.ObjectId[] | IBotUser[];
  session?: string;
  contact?: string;
  trx20_address?: string;
  customer_service_link?: string;
  owners?: mongoose.Schema.Types.ObjectId[] | IBotUser[]; // 拥有者，存 BotUser _id 关联
  authorized_users?: mongoose.Schema.Types.ObjectId[] | IBotUser[]; // 授权人，存 BotUser _id 关联
  creator?: mongoose.Schema.Types.ObjectId | IBotUser; // 创建者，存 BotUser _id 关联
  expireAt?: Date; // 到期时间
  type?: 'public' | 'custom'; // 类型
  isExpired?: boolean; // 是否过期，默认 false
  preExpirationNotified?: boolean; // 是否已发送过期提醒，默认 false
  clonedFrom?: mongoose.Schema.Types.ObjectId | IBot; // 新增：从哪个机器人clone的
  canBeCloned?: boolean; // 新增：是否可克隆
  fee: number; // 闪兑费率
  downStream_fee: number; // 下游闪兑费率
  auto_exchange_address: string; // 自动兑换地址
  private_key: string; // 私钥
  exchange_rate: number; // 闪兑汇率
  groups: mongoose.Schema.Types.ObjectId[] | IGroup[]; // 关联的群组
  webhook_url: string; // webhook url
  energy_address: string; // 能量地址
  energy_privateKey: string; // 能量私钥
  min_interger_limit: number; // 使用预支功能的最少积分数
  isCreatedByAdmin?: boolean; // 是否由管理员创建，由管理创建的机器人就是平台机器人
  botUser: mongoose.Schema.Types.ObjectId | IBotUser; // 机器人用户
  rentImage?: string; // 闪租图片
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

export interface IPricePair extends Document {
  name: string;
  expenditure: number; // 来价
  expiration: number; // 有效时间 (hour)
  times: number; // 笔数
  type?: string; // 类型, 闪租还是日租
  sale?: number; // 售价
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

const pricePairSchema = new mongoose.Schema({
  name: { type: String, required: false },
  expenditure: { type: Number, required: true },
  expiration: { type: Number, required: true },
  times: { type: Number, required: true },
  type: { type: String, enum: ['hourly', 'daily'], required: true },
  sale: { type: Number, required: false },
});

const botSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      trim: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    botName: {
      type: String,
      trim: true,
    },
    remark: {
      type: String,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    botUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BotUser',
    },
    // start 消息
    message: {
      type: String,
      trim: true,
    },
    userName: { type: String, required: false },
    isOnline: {
      type: Boolean,
      default: true,
    },
    botUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BotUser',
      },
    ],
    menus: {
      type: [menuSchema],
      default: [],
    },
    keyboards: {
      type: [keyboardSchema],
      default: [],
    },
    price_pairs: {
      type: [pricePairSchema],
      default: [],
    },
    commands: {
      type: [commandSchema],
      default: [],
    },
    session: {
      type: String,
      trim: true,
    },
    contact: {
      type: String,
      trim: true,
    },
    customer_service_link: {
      type: String,
      trim: true,
    },
    trx20_address: {
      type: String,
      trim: true,
    },
    owners: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BotUser',
      },
    ], // 存 BotUser _id 关联
    authorized_users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BotUser',
      },
    ], // 存 BotUser _id 关联
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BotUser',
    }, // 创建者，存 BotUser _id 关联
    expireAt: {
      type: Date,
    },
    type: {
      type: String,
      enum: ['public', 'custom'],
      default: 'custom',
      trim: true,
    },
    isExpired: {
      type: Boolean,
      default: false,
    }, // 是否过期，默认 false
    preExpirationNotified: {
      type: Boolean,
      default: false,
    }, // 是否已发送过期提醒，默认 false
    clonedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bot',
      default: null,
    }, // 新增：从哪个机器人clone的
    canBeCloned: {
      type: Boolean,
      default: false,
    }, // 新增：是否可克隆
    fee: {
      type: Number,
      default: 0,
    }, // 闪兑费用
    downStream_fee: {
      type: Number,
      default: 0,
    }, // 下游闪兑费率
    auto_exchange_address: {
      type: String,
      trim: true,
    }, // 自动兑换地址
    private_key: {
      type: String,
      trim: true,
      select: false,
    }, // 私钥
    exchange_rate: {
      type: Number,
      default: 0,
    }, // 闪兑汇率
    groups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
      },
    ],
    webhook_url: {
      type: String,
      trim: true,
    }, // 新增：webhook url
    energy_address: {
      type: String,
      trim: true,
    },
    energy_privateKey: {
      type: String,
      trim: true,
      select: false,
    },
    min_interger_limit: {
      type: Number,
      required: false,
      default: 10,
    },
    isCreatedByAdmin: {
      type: Boolean,
      default: false,
    },
    rentImage: {
      type: String,
      trim: true,
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const Bot = mongoose.model<IBot>('Bot', botSchema);

export default Bot;
