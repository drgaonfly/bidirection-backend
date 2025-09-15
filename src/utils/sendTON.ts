// import TonWeb from 'tonweb';
// import { mnemonicToKeyPair } from 'tonweb-mnemonic';
// import { IPremium } from '../models/premium';

// // TON网络配置
// const TON_API_ENDPOINT = 'https://toncenter.com/api/v2/jsonRPC';

// /**
//  * 发送TON到指定地址
//  * @param order Premium订单对象
//  * @param mnemonic 发送方的助记词
//  * @returns 交易哈希
//  */
// export async function sendTON(
//   order: IPremium,
//   mnemonic: string,
// ): Promise<string> {
//   try {
//     console.warn('开始TON支付:', order.id);

//     // 验证订单信息
//     if (!order.receiving_address) {
//       throw new Error('收款地址不能为空');
//     }
//     if (!order.receiving_amount || order.receiving_amount <= 0) {
//       throw new Error('支付金额无效');
//     }

//     // 初始化TonWeb
//     const tonweb = new TonWeb(
//       new TonWeb.HttpProvider(TON_API_ENDPOINT, {
//         apiKey: process.env.TON_API_KEY || '', // 如果有API密钥的话
//       }),
//     );

//     // 从助记词生成密钥对
//     const keyPair = await mnemonicToKeyPair(mnemonic.split(' '));

//     // 创建钱包实例
//     const WalletClass = tonweb.wallet.all.v3R2;
//     const wallet = new WalletClass(tonweb.provider, {
//       publicKey: keyPair.publicKey,
//     });

//     // 获取钱包地址
//     const walletAddress = await wallet.getAddress();
//     console.warn('发送方地址:', walletAddress.toString(true, true, true));
//     console.warn('接收方地址:', order.receiving_address);
//     console.warn('支付金额:', order.receiving_amount, 'nanoTON');

//     // 检查余额
//     const balance = await tonweb.provider.getBalance(walletAddress.toString());
//     const balanceInTon = TonWeb.utils.fromNano(balance);
//     const amountInTon = TonWeb.utils.fromNano(
//       order.receiving_amount.toString(),
//     );

//     console.warn('钱包余额:', balanceInTon, 'TON');
//     console.warn('需要支付:', amountInTon, 'TON');

//     if (parseFloat(balance) < order.receiving_amount) {
//       throw new Error(
//         `余额不足: 当前余额 ${balanceInTon} TON，需要 ${amountInTon} TON`,
//       );
//     }

//     // 获取序列号
//     const seqno = await wallet.methods.seqno().call();
//     console.warn('当前序列号:', seqno);

//     // 构建转账参数
//     const transferParams = {
//       secretKey: keyPair.secretKey,
//       toAddress: order.receiving_address,
//       amount: order.receiving_amount, // 已经是nanoTON单位
//       seqno: seqno || 0,
//       payload: order.payload || '', // 如果有payload的话
//       sendMode: 1 + 2, // 标准发送模式
//     };

//     // 发送交易
//     console.warn('发送TON交易...');
//     const transfer = wallet.methods.transfer(transferParams);
//     const result = await transfer.send();

//     console.warn('交易发送成功:', result);

//     // 更新订单状态
//     order.tx_id = result.toString();
//     order.status = 'success';
//     order.from = walletAddress.toString(true, true, true);
//     await order.save();

//     console.warn('TON支付完成:', {
//       orderId: order.id,
//       hash: result.toString(),
//       amount: amountInTon + ' TON',
//     });

//     return result.toString();
//   } catch (error) {
//     console.error('TON支付失败:', error.message);

//     // 更新订单状态为失败
//     order.status = 'failed';
//     order.error = error.message;
//     await order.save();

//     throw new Error(`TON支付失败: ${error.message}`);
//   }
// }

// /**
//  * 验证TON地址格式
//  * @param address TON地址
//  * @returns 是否有效
//  */
// export function isValidTonAddress(address: string): boolean {
//   try {
//     // TON地址通常以EQ开头，长度为48个字符（base64编码）
//     return (
//       /^EQ[A-Za-z0-9_-]{46}$/.test(address) ||
//       /^UQ[A-Za-z0-9_-]{46}$/.test(address) ||
//       /^kQ[A-Za-z0-9_-]{46}$/.test(address)
//     );
//   } catch (error) {
//     return false;
//   }
// }

// /**
//  * 将TON金额从人类可读格式转换为nanoTON
//  * @param amount TON金额
//  * @returns nanoTON金额
//  */
// export function tonToNano(amount: number): string {
//   return TonWeb.utils.toNano(amount.toString());
// }

// /**
//  * 将nanoTON转换为人类可读的TON格式
//  * @param nanoAmount nanoTON金额
//  * @returns TON金额
//  */
// export function nanoToTon(nanoAmount: string | number): string {
//   return TonWeb.utils.fromNano(nanoAmount.toString());
// }

// /**
//  * 获取钱包余额（TON）
//  * @param mnemonic 助记词
//  * @returns 余额（TON格式）
//  */
// export async function getTonBalance(mnemonic: string): Promise<string> {
//   try {
//     const tonweb = new TonWeb(
//       new TonWeb.HttpProvider(TON_API_ENDPOINT, {
//         apiKey: process.env.TON_API_KEY || '',
//       }),
//     );

//     const keyPair = await mnemonicToKeyPair(mnemonic.split(' '));
//     const WalletClass = tonweb.wallet.all.v3R2;
//     const wallet = new WalletClass(tonweb.provider, {
//       publicKey: keyPair.publicKey,
//     });

//     const walletAddress = await wallet.getAddress();
//     const balance = await tonweb.provider.getBalance(walletAddress.toString());

//     return TonWeb.utils.fromNano(balance);
//   } catch (error) {
//     console.error('获取TON余额失败:', error.message);
//     throw new Error(`获取TON余额失败: ${error.message}`);
//   }
// }
