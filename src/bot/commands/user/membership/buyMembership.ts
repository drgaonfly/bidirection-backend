import { MyContext } from '../../../types';
import { InlineKeyboard } from 'grammy';

const MEMBERSHIP_PRICES = {
  '3m': 15,
  '6m': 25,
  '1y': 45,
};

const MEMBERSHIP_NAMES = {
  '3m': '3个月会员',
  '6m': '6个月会员',
  '1y': '1年会员',
};

export async function handleBuyMembershipCommand(
  ctx: MyContext,
  duration: string,
) {
  const price = MEMBERSHIP_PRICES[duration];
  const membershipName = MEMBERSHIP_NAMES[duration];

  const inline = new InlineKeyboard().row().text('取消', 'close');

  const message = `
请发送 <b>${price}U</b> 到以下地址开通 <b>${membershipName}</b>

收款地址:
@test
https://t.me/test

多个TG账号专用:
@username1
@username2

您选择了 ${membershipName}
您需要支付: ${price}U
`;

  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: inline,
  });
}
