export const data = {
  eleventyExcludeFromCollections: true,
  eleventyAllowMissingExtension: true,
  permalink: (data) =>
    data.metadata.atproto?.did ? "/.well-known/atproto-did" : false,
};

export function render(data) {
  return data.metadata.atproto.did;
}
