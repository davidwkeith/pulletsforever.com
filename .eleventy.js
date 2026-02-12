import dotenv from "dotenv"
dotenv.config()

// 11ty Plugins
import pluginBundle from "@11ty/eleventy-plugin-bundle"
import pluginFavicon from "eleventy-plugin-gen-favicons"
import pluginHtmlMinifier from "./plugins/html-minifier.js"
import pluginNavigation from "@11ty/eleventy-navigation"
import pluginRss from '@11ty/eleventy-plugin-rss'
import pluginSocialImages from "./plugins/social-images.js"
import pluginSyntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight"
import { contentSecurityPolicyPlugin } from "@jackdbd/eleventy-plugin-content-security-policy"

// Local Plugins
import pluginImages from "./plugins/11ty.images.js"
import pluginFilters from "./plugins/filters.js"
import pluginSchema from "./plugins/schema.js"
import pluginMarkdown from "./plugins/markdown-it.js"

import csp from "./src/_data/csp.js"

const input = `src/`
const output = `_site/`

export default function (eleventyConfig) {
  eleventyConfig.addGlobalData("inputDir", input);
  eleventyConfig.addGlobalData("baseURL", "https://pulletsforever.com");

  eleventyConfig.addPassthroughCopy(`${input}/**/*.{svg,webp,png,jpg,jpeg,gif,zip}`)

  // Downloadable prompt files (copied as-is, not processed as templates)
  eleventyConfig.addPassthroughCopy({
    [`${input}/posts/personal-shopper/personal-shopper-prompt.md`]: "/personal-shopper/personal-shopper-prompt.md"
  })
  eleventyConfig.ignores.add("src/posts/**/*-prompt.md")
  eleventyConfig.addPassthroughCopy(`${input}/fonts`)
  eleventyConfig.addPassthroughCopy({
    [`${input}/.well-known/keybase.txt`]: "/.well-known/keybase.txt",
    "./node_modules/prismjs/themes/prism-okaidia.css": "/css/prism-okaidia.css",
    "./node_modules/img-comparison-slider/dist/styles.css": "/css/img-comparison-slider.css",
    "./node_modules/img-comparison-slider/dist/index.js": "/js/img-comparison-slider.js",
  });


  // Plugins
  eleventyConfig.addPlugin(pluginBundle);
  eleventyConfig.addPlugin(pluginFavicon, { outputDir: output });
  eleventyConfig.addPlugin(pluginHtmlMinifier);
  eleventyConfig.addPlugin(pluginFilters);
  eleventyConfig.addPlugin(pluginImages);
  eleventyConfig.addPlugin(pluginNavigation);
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(pluginSchema);
  eleventyConfig.addPlugin(pluginSyntaxHighlight, {
    preAttributes: {
      "data-language": function({ language }) {
        const names = {
          bash: "Bash", css: "CSS", diff: "Diff", html: "HTML",
          javascript: "JavaScript", js: "JavaScript", json: "JSON",
          markdown: "Markdown", md: "Markdown", njk: "Nunjucks",
          php: "PHP", python: "Python", ruby: "Ruby",
          shell: "Shell", sql: "SQL", swift: "Swift",
          text: "Text", ts: "TypeScript", typescript: "TypeScript",
          xml: "XML", yaml: "YAML", yml: "YAML",
        };
        return names[language] || language;
      },
    },
  });
  eleventyConfig.addPlugin(pluginMarkdown);

  eleventyConfig.addPlugin(pluginSocialImages);

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
    reportOnly: false,
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
