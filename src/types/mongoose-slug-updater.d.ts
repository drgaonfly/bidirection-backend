// types/mongoose-slug-updater.d.ts

declare module 'mongoose-slug-updater' {
  import { Schema } from 'mongoose';

  interface SlugOptions {
    // 在这里添加你需要的任何选项
    slugPaddingSize?: number;
    separator?: string;
    lang?: string;
    truncate?: number;
    backwardCompatible?: boolean;
  }

  function slugPlugin(schema: Schema, options?: SlugOptions): void;

  export = slugPlugin;
}
