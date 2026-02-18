// Type declarations for Eleventy and its plugin ecosystem

// --- Eleventy Config ---

interface EleventyConfig {
  addPlugin(plugin: unknown, options?: unknown): void;
  addFilter(name: string, callback: (...args: any[]) => unknown): void;
  addAsyncFilter(
    name: string,
    callback: (...args: any[]) => Promise<unknown>,
  ): void;
  addShortcode(name: string, callback: (...args: any[]) => string): void;
  addTransform(
    name: string,
    callback: (
      this: { page: { outputPath: string } },
      content: string,
    ) => string | Promise<string>,
  ): void;
  addPassthroughCopy(input: string | Record<string, string>): void;
  addGlobalData(key: string, value: unknown): void;
  addExtension(
    extension: string | string[],
    options: { key: string },
  ): void;
  addTemplateFormats(format: string): void;
  addDataExtension(
    extension: string,
    options: {
      parser: (filePath: string) => Promise<unknown>;
      read: boolean;
    },
  ): void;
  setLibrary(name: string, lib: unknown): void;
  getFilter(name: string): (...args: any[]) => unknown;
  on(
    event: string,
    callback: (...args: any[]) => void | Promise<void>,
  ): void;
  ignores: { add(path: string): void };
}

// --- Eleventy Data Cascade ---

interface EleventyPage {
  url: string;
  fileSlug: string;
  filePathStem: string;
  date: Date;
  inputPath: string;
  outputPath: string;
}

interface EleventyCollectionItem {
  url: string;
  date: Date;
  inputPath: string;
  fileSlug: string;
  data: Record<string, any>;
  page: EleventyPage;
  templateContent: string;
  rawInput: string;
  content: string;
}

interface EleventyData {
  metadata: typeof import("../src/_data/metadata.ts").default;
  collections: {
    all: EleventyCollectionItem[];
    posts: EleventyCollectionItem[];
    [tag: string]: EleventyCollectionItem[];
  };
  page: EleventyPage;
  title?: string;
  date?: Date;
  modified?: Date;
  tags?: string[];
  description?: string;
  post?: EleventyCollectionItem;
  [key: string]: unknown;
}

// --- Eleventy Core ---

declare module "@11ty/eleventy" {
  export const RenderPlugin: unknown;
}

// --- Eleventy Plugins ---

declare module "@11ty/eleventy-plugin-bundle" {
  const plugin: (config: EleventyConfig) => void;
  export default plugin;
}

declare module "eleventy-plugin-gen-favicons" {
  const plugin: (config: EleventyConfig, options?: unknown) => void;
  export default plugin;
}

declare module "@11ty/eleventy-navigation" {
  const plugin: (config: EleventyConfig) => void;
  export default plugin;
}

declare module "@11ty/eleventy-plugin-rss" {
  export function absoluteUrl(url: string, base: string): string;
  export function convertHtmlToAbsoluteUrls(
    html: string,
    base: string,
  ): Promise<string>;
  export function dateToRfc3339(date: Date): string;
  export function getNewestCollectionItemDate(
    collection: EleventyCollectionItem[],
  ): Date;
  const plugin: (config: EleventyConfig) => void;
  export default plugin;
}

declare module "@11ty/eleventy-plugin-syntaxhighlight" {
  const plugin: (config: EleventyConfig, options?: unknown) => void;
  export default plugin;
}

declare module "@11ty/eleventy-plugin-webc" {
  const plugin: (config: EleventyConfig, options?: unknown) => void;
  export default plugin;
}

declare module "@jackdbd/eleventy-plugin-content-security-policy" {
  export function contentSecurityPolicyPlugin(
    config: EleventyConfig,
    options?: unknown,
  ): void;
}

declare module "@11ty/eleventy-img" {
  interface ImageOptions {
    widths?: (number | "auto")[];
    formats?: string[];
    outputDir?: string;
    urlPath?: string;
    svgShortCircuit?: boolean | "size";
    cacheOptions?: { duration?: string; directory?: string };
    filenameFormat?: (
      id: string,
      src: string,
      width: number,
      format: string,
    ) => string;
    [key: string]: unknown;
  }

  interface ImageResult {
    [format: string]: {
      filename: string;
      outputPath: string;
      url: string;
      sourceType: string;
      srcset: string;
      width: number;
      height: number;
      size: number;
    }[];
  }

  function Image(src: string, options?: ImageOptions): Promise<ImageResult>;

  namespace Image {
    function eleventyImageTransformPlugin(
      config: EleventyConfig,
      options?: unknown,
    ): void;
    function statsSync(
      src: string,
      options?: ImageOptions,
    ): ImageResult;
  }

  export default Image;
}

// --- Markdown-it ---

declare module "markdown-it-anchor" {
  import type MarkdownIt from "markdown-it";
  interface AnchorOptions {
    permalink?: unknown;
    slugify?: (s: string) => string;
    level?: number[];
    [key: string]: unknown;
  }
  const plugin: MarkdownIt.PluginWithOptions<AnchorOptions>;
  export default plugin;
  export const permalink: {
    linkAfterHeader(options: unknown): unknown;
    linkInsideHeader(options: unknown): unknown;
  };
}

// --- Satori ---

declare module "satori-html" {
  export function html(markup: string): unknown;
  export function html(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): unknown;
}
