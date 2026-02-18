export const data = {
  eleventyExcludeFromCollections: true,
  eleventyAllowMissingExtension: true,
  permalink: (data: EleventyData) =>
    data.metadata.atproto?.did ? "/.well-known/atproto-did" : false,
};

export function render(data: EleventyData): string {
  return data.metadata.atproto.did;
}
