// TODO: Validate the Schema.org JSON-LD before returning it

export default function (eleventyConfig) {
  eleventyConfig.addShortcode("generateSchema", async function (schema) {
      return JSON.stringify(schema);
    }
  );
};
