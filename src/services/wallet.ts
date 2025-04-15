import { IUser } from '../models/user';
import Setting from '../models/setting';
import User from '../models/user';
import { Response } from 'express';
import { decrypt } from './encrypt';

// 获取管理员钱包配置信息
export async function getAdminWalletConfig(network: string) {
  const adminAddressKey = `${network}SuperAdmin`;
  const secretKeyKey = `address${network}Key`;

  const adminAddressSetting = await Setting.findOne({ key: adminAddressKey });
  const secretKeySetting = await Setting.findOne({ key: secretKeyKey });

  return {
    adminAddressSetting,
    secretKeySetting,
  };
}

export const getAdminWallet = async (network: string) => {
  const { adminAddressSetting, secretKeySetting } =
    await getAdminWalletConfig(network);

  const adminWallet = {
    network: network,
    address: adminAddressSetting?.value,
    secretKey: decrypt(secretKeySetting?.value),
  };

  return adminWallet;
  // 直接返回设置表中的地址
};

export async function findWalletInCreatorChain(
  user: any,
  network: string,
  model: any,
): Promise<any> {
  // 如果是管理员或没有创建者，返回null
  if (user.isAdmin || !user.creator) {
    return null;
  }

  // 获取创建者ID
  const creatorId =
    typeof user.creator === 'object' && '_id' in user.creator
      ? user.creator._id
      : user.creator;

  // 查找创建者的钱包
  const creatorWallet = await model.findOne({
    user: creatorId,
    network: network,
  });

  if (creatorWallet) {
    return creatorWallet;
  }

  // 如果创建者没有钱包，递归查找创建者的创建者
  const creator = await User.findById(creatorId).populate('creator');

  if (creator) {
    return findWalletInCreatorChain(creator, network, model);
  }

  return null;
}

export const getUserWallet = async (
  user: IUser,
  network: string,
  res: Response,
  model: any,
) => {
  // 1. 先查找用户自己是否有对应网络的钱包
  let wallet = await model.findOne({
    user: user._id,
    network: network,
  });

  // 2. 递归查找创建者链上的钱包，直到找到钱包或到达顶级管理员

  // 如果用户没有钱包，递归查找创建者链上的钱包
  if (!wallet && !user.isAdmin) {
    wallet = await findWalletInCreatorChain(user, network, model);
  }

  // 3. 如果都没找到，返回授权失败
  if (!wallet) {
    res.status(403);
    throw new Error('授权失败：未找到可用的钱包');
  }

  return wallet;
};
