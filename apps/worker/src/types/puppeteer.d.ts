declare module 'puppeteer' {
  interface Browser {
    newPage(): Promise<Page>;
    close(): Promise<void>;
  }

  interface Page {
    setContent(html: string, options?: { waitUntil?: string; timeout?: number }): Promise<void>;
    pdf(options?: Record<string, unknown>): Promise<Buffer>;
  }

  function launch(options?: Record<string, unknown>): Promise<Browser>;

  export default { launch };
  export { launch };
}
