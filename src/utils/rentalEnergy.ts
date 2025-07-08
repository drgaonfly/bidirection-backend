import { TronWeb } from 'tronweb';

const tronWeb = new TronWeb({
  fullHost: 'https://api.trongrid.io',
  privateKey: 'YOUR_PRIVATE_KEY',
});

export async function rentEnergy(
  fromAddress: string,
  toAddress: string,
  amountTRX: number,
): Promise<any> {
  try {
    const amountSunStr = tronWeb.toSun(amountTRX); // e.g. '1000000'
    const amountSun = Number(amountSunStr); // convert to number

    const transaction = await tronWeb.transactionBuilder.delegateResource(
      amountSun,
      toAddress,
      'ENERGY',
      fromAddress,
    );

    const signedTx = await tronWeb.trx.sign(transaction);
    const result = await tronWeb.trx.sendRawTransaction(signedTx);

    return result;
  } catch (error) {
    console.error('租赁能量失败:', error);
    throw error;
  }
}
