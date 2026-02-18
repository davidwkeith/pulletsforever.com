export const data = {
  eleventyExcludeFromCollections: true,
  permalink: "/.well-known/app-ads.txt",
};

export function render(): string {
  return `# No Ads Here`;
}
