import path from "path";
import Image from "@11ty/eleventy-img";

function relativeToInputPath(inputPath, relativeFilePath) {
  let split = inputPath.split("/");
  split.pop();

  return path.resolve(split.join(path.sep), relativeFilePath);
}

function isFullUrl(url) {
  try {
    new URL(url);
    return true;
  } catch(e) {
    return false;
  }
}

export default function(eleventyConfig) {
	eleventyConfig.addPlugin(Image.eleventyImageTransformPlugin, {
		// which file extensions to process
		extensions: "html",

		// Output all images to a central directory for caching
		outputDir: "./_build/img/",
		urlPath: "/img/",

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
};