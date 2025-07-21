import { MyContext } from '../../../types';
import { InlineKeyboard } from 'grammy';
import { renderFile } from 'ejs';
import { join } from 'path';

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

  const message = await renderFile(
    join(__dirname, '../../../../templates/buyMembership.ejs'),
    { price, membershipName },
  );

  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: inline,
  });
}
