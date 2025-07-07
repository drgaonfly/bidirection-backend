import { InlineKeyboard } from 'grammy';
import { chargeOptions } from '../../../models/payment';

const charger = new InlineKeyboard();

// 先分组
const usdtOptions = chargeOptions.filter(
  (opt) => opt.callback.includes('usdt') && opt.amount,
);
const trxOptions = chargeOptions.filter(
  (opt) => opt.callback.includes('trx') && opt.amount,
);
const customUsdt = chargeOptions.find(
  (opt) => opt.callback === 'charge_custom_usdt',
);
const customTrx = chargeOptions.find(
  (opt) => opt.callback === 'charge_custom_trx',
);

// 添加 USDT 金额按钮
usdtOptions.forEach((opt, idx) => {
  charger.text(opt.label, opt.callback);
  if ((idx + 1) % 4 === 0) charger.row();
});

// 添加“其他金额【USDT】”
if (customUsdt) {
  charger.text(customUsdt.label, customUsdt.callback).row();
}

// 添加 TRX 金额按钮
trxOptions.forEach((opt, idx) => {
  charger.text(opt.label, opt.callback);
  if ((idx + 1) % 4 === 0) charger.row();
});

// 添加“其他金额【TRX】”
if (customTrx) {
  charger.text(customTrx.label, customTrx.callback).row();
}

// 添加取消按钮
charger.text('取消充值', 'close');

export default charger;
