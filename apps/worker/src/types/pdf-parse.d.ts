declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: unknown;
    version: string;
  }

  interface PDFOptions {
    max?: number;
    pagerender?: (pageData: unknown) => Promise<string>;
    version?: string;
  }

  function pdf(dataBuffer: Buffer, options?: PDFOptions): Promise<PDFData>;

  export default pdf;
}
