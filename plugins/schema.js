// TODO: Validate the Schema.org JSON-LD before returning it

export default function (eleventyConfig) {
  const generateSchema = (schema) => JSON.stringify(schema);

  eleventyConfig.addShortcode("generateSchema", generateSchema);
  eleventyConfig.addFilter("generateSchema", generateSchema);
};
