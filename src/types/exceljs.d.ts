// 在 src/types/exceljs.d.ts
import 'exceljs';

declare module 'exceljs' {
  namespace stream.xlsx {
    interface WorkbookReader {
      // eslint-disable-next-line @typescript-eslint/ban-types
      on(event: string, listener: Function): this;
    }
  }
}
