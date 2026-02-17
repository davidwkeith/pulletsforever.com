export const data = {
  eleventyExcludeFromCollections: true,
  permalink: "/.well-known/gpc.json",
};

export function render() {
  const today = new Date().toISOString().split("T")[0];
  return JSON.stringify({ gpc: true, lastUpdate: today }, null, 2);
}
