export const data = {
  eleventyExcludeFromCollections: true,
  permalink: "/.well-known/ads.txt",
};

export function render(): string {
  return `# No Ads Here`;
}
