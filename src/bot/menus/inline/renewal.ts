// src/menus/inline/exampleInlineMenu.ts
import { InlineKeyboard } from 'grammy';
import { renewalOptions } from '../../../models/subscription';

const renewal = new InlineKeyboard();

Object.values(renewalOptions).forEach((option, index) => {
  renewal.text(`${option.label} (${option.price}U)`, option.type);

  // 每两个选项换一行
  if (index % 2 === 0 && index !== Object.values(renewalOptions).length - 1) {
    renewal.row();
  }
});

export default renewal;
