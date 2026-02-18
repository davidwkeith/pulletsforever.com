import Image from "@11ty/eleventy-img";

export default function (eleventyConfig: EleventyConfig): void {
  eleventyConfig.addPlugin(Image.eleventyImageTransformPlugin, {
    // which file extensions to process
    extensions: "html",

    // Let Eleventy Image use default behavior - outputs relative to each page
    // Do not define urlPath or outputDir to enable automatic relative paths

    // optional, output image formats
    formats: ["webp", "jpeg"],

    // optional, output image widths
    widths: ["auto"],

    // optional, attributes assigned on <img> override these values.
    defaultAttributes: {
      loading: "lazy",
      decoding: "async",
      sizes: "100vw",
    },
  });
}
