declare module "xlsx" {
  export const utils: {
    aoa_to_sheet: (data: any[][]) => WorkSheet;
    book_new: () => WorkBook;
    book_append_sheet: (wb: WorkBook, ws: WorkSheet, name: string) => void;
    encode_cell: (cell: { r: number; c: number }) => string;
  };
  export function writeFile(wb: WorkBook, filename: string): void;
  export interface WorkSheet {
    [key: string]: any;
  }
  export interface WorkBook {
    [key: string]: any;
  }
}

declare module "tesseract.js" {
  export function createWorker(lang: string): Promise<{
    recognize: (image: string) => Promise<{ data: { text: string } }>;
    terminate: () => Promise<void>;
  }>;
}
