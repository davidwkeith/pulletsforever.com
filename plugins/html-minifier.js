import { minify } from "html-minifier-terser"

const htmlMinifierOptions = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true,
  minifyCSS: true,
  minifyJS: true,
}

export default function (eleventyConfig) {
  eleventyConfig.addTransform("htmlmin", async function (content) {
    if ((this.page.outputPath || "").endsWith(".html")) {
      return await minify(content, htmlMinifierOptions)
    }
    return content
  })
}
