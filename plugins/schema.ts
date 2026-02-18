export default function (eleventyConfig: EleventyConfig): void {
  const generateSchema = (schema: unknown): string => JSON.stringify(schema);

  eleventyConfig.addShortcode("generateSchema", generateSchema);
  eleventyConfig.addFilter("generateSchema", generateSchema);
}
