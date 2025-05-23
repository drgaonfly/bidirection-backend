// src/menus/inline/exampleInlineMenu.ts
import { InlineKeyboard } from 'grammy';
import { renewalOptions } from '../../../models/subscription';

const renewal = new InlineKeyboard();

Object.values(renewalOptions).forEach((option) => {
  renewal.text(`${option.label} (${option.price}U)`, option.type).row();
});

export default renewal;
