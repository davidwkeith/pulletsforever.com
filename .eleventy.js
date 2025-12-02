import dotenv from "dotenv"
dotenv.config()

// 11ty Plugins
import pluginBundle from "@11ty/eleventy-plugin-bundle"
import pluginFavicon from "eleventy-plugin-gen-favicons"
import pluginFilesMinifier from "@sherby/eleventy-plugin-files-minifier"
import pluginNavigation from "@11ty/eleventy-navigation"
import pluginRss from '@11ty/eleventy-plugin-rss'
import pluginSocialImages from "@manustays/eleventy-plugin-generate-social-images"
import pluginSyntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight"
import { contentSecurityPolicyPlugin } from "@jackdbd/eleventy-plugin-content-security-policy"

// Local Plugins
import pluginImages from "./plugins/11ty.images.js"
import pluginFilters from "./plugins/filters.js"
import pluginSchema from "./plugins/schema.js"
import pluginMarkdown from "./plugins/markdown-it.js"

import csp from "./src/_data/csp.js"

const input = `src/`
const output = `_build/`

export default function (eleventyConfig) {
  eleventyConfig.addGlobalData("inputDir", input);
  eleventyConfig.addGlobalData("baseURL", "https://pulletsforever.com");

  eleventyConfig.addPassthroughCopy(`${input}/**/*.{svg,webp,png,jpg,jpeg,gif,zip}`)
  eleventyConfig.addPassthroughCopy(`${input}/fonts`)
  eleventyConfig.addPassthroughCopy({
    [`${input}/.well-known/`]: "/.well-known/",
    "./node_modules/prismjs/themes/prism-okaidia.css": "/css/prism-okaidia.css",
  });


  // Plugins
  eleventyConfig.addPlugin(pluginBundle);
  eleventyConfig.addPlugin(pluginFavicon, { outputDir: output });
  eleventyConfig.addPlugin(pluginFilesMinifier);
  eleventyConfig.addPlugin(pluginFilters);
  eleventyConfig.addPlugin(pluginImages);
  eleventyConfig.addPlugin(pluginNavigation);
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(pluginSchema);
  eleventyConfig.addPlugin(pluginSyntaxHighlight);
  eleventyConfig.addPlugin(pluginMarkdown);

  /**
   * Social Images
   */
  eleventyConfig.addPlugin(pluginSocialImages, {
    outputDir: `${output}/social-cards/`,
    urlPath: "/social-cards",
    bgGradient: ["#ABB8C0", "#A0ACB3"],
  })

  /**
   *  Content Security Policy
   */
  eleventyConfig.addPlugin(contentSecurityPolicyPlugin, {
    directives: csp,
    globPatterns: ["/*"],
    globPatternsDetach: ["/*.{png,jpg,jpeg,webp}"],
    includePatterns: ["/**/**.html"],
    excludePatterns: [],
    hosting: "cloudflare-pages",
    reportOnly: true,
  })

  /**
   * Shortcodes
   */
  eleventyConfig.addShortcode("currentBuildDate", () => (new Date()).toISOString())
  eleventyConfig.addShortcode("expiryDate", () => ((new Date()).setFullYear(new Date().getFullYear() + 1)).toISOString())

  return {
    templateFormats: ["html", "md", "njk"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: {
      input,
      output,
    },
  }
}
