// Expose environment info to templates
// CF_PAGES is set by Cloudflare Pages during builds
export default {
  isProduction: !!process.env.CF_PAGES,
};
