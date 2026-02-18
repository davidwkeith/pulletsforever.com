import dotenv from "dotenv";
dotenv.config();

// 11ty Plugins
import pluginBundle from "@11ty/eleventy-plugin-bundle";
import pluginFavicon from "eleventy-plugin-gen-favicons";
import pluginHtmlMinifier from "./plugins/html-minifier.ts";
import pluginNavigation from "@11ty/eleventy-navigation";
import pluginRss from "@11ty/eleventy-plugin-rss";
import pluginSocialImages from "./plugins/social-images.ts";
import pluginSyntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import pluginWebc from "@11ty/eleventy-plugin-webc";
import { RenderPlugin } from "@11ty/eleventy";
import { contentSecurityPolicyPlugin } from "@jackdbd/eleventy-plugin-content-security-policy";

// Local Plugins
import pluginImages from "./plugins/11ty.images.ts";
import pluginFilters from "./plugins/filters.ts";
import pluginSchema from "./plugins/schema.ts";
import pluginMarkdown from "./plugins/markdown-it.ts";

import csp from "./src/_data/csp.ts";

const input = `src/`;
const output = `_site/`;

export default function (eleventyConfig: EleventyConfig) {
  // Register .11ty.ts as an alias for .11ty.js templates
  eleventyConfig.addExtension("11ty.ts", { key: "11ty.js" });

  // Register .ts data files so Eleventy discovers *.11tydata.ts
  eleventyConfig.addDataExtension("ts", {
    parser: async (filePath: string) => {
      const mod = await import(filePath);
      return mod.default ?? mod;
    },
    read: false,
  });

  eleventyConfig.addGlobalData("inputDir", input);
  eleventyConfig.addGlobalData("baseURL", "https://pulletsforever.com");

  eleventyConfig.addPassthroughCopy(
    `${input}/**/*.{svg,webp,png,jpg,jpeg,gif,zip}`,
  );

  // Downloadable prompt files (copied as-is, not processed as templates)
  eleventyConfig.addPassthroughCopy({
    [`${input}/posts/personal-shopper/personal-shopper-prompt.md`]:
      "/personal-shopper/personal-shopper-prompt.md",
  });
  eleventyConfig.ignores.add("src/posts/**/*-prompt.md");
  eleventyConfig.addPassthroughCopy(`${input}/fonts`);
  eleventyConfig.addPassthroughCopy({
    [`${input}/.well-known/keybase.txt`]: "/.well-known/keybase.txt",
    "./node_modules/prismjs/themes/prism-okaidia.css": "/css/prism-okaidia.css",
    "./node_modules/img-comparison-slider/dist/styles.css":
      "/css/img-comparison-slider.css",
    "./node_modules/img-comparison-slider/dist/index.js":
      "/js/img-comparison-slider.js",
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
      "data-language": function ({
        language,
      }: {
        language: string;
      }): string {
        const names: Record<string, string> = {
          bash: "Bash",
          css: "CSS",
          diff: "Diff",
          html: "HTML",
          javascript: "JavaScript",
          js: "JavaScript",
          json: "JSON",
          markdown: "Markdown",
          md: "Markdown",
          njk: "Nunjucks",
          php: "PHP",
          python: "Python",
          ruby: "Ruby",
          shell: "Shell",
          sql: "SQL",
          swift: "Swift",
          text: "Text",
          ts: "TypeScript",
          typescript: "TypeScript",
          xml: "XML",
          yaml: "YAML",
          yml: "YAML",
        };
        return names[language] || language;
      },
    },
  });
  eleventyConfig.addPlugin(pluginMarkdown);
  eleventyConfig.addPlugin(RenderPlugin);
  eleventyConfig.addPlugin(pluginWebc, {
    components: "src/_includes/components/**/*.webc",
  });

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
  });

  // dateToRfc3339 is registered as Nunjucks-only by eleventy-plugin-rss.
  // Re-register as universal filter so WebC components can use it.
  eleventyConfig.addFilter("dateToRfc3339", (dateObj: Date) => {
    const s = dateObj.toISOString();
    const split = s.split(".");
    split.pop();
    return split.join("") + "Z";
  });

  /**
   * Shortcodes
   */
  eleventyConfig.addShortcode("currentBuildDate", () =>
    new Date().toISOString(),
  );
  eleventyConfig.addShortcode("expiryDate", () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString();
  });

  // Social icon SVG shortcode — callable from Nunjucks and WebC
  eleventyConfig.addShortcode(
    "socialIcon",
    (service: string, size?: number) => {
      const s = size || 24;
      const icons: Record<string, string> = {
        mastodon: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.327 8.566c0-4.339-2.843-5.61-2.843-5.61-1.433-.658-3.894-.935-6.451-.956h-.063c-2.557.021-5.016.298-6.45.956 0 0-2.843 1.271-2.843 5.61 0 .993-.019 2.181.012 3.441.103 4.243.778 8.425 4.701 9.463 1.809.479 3.362.579 4.612.51 2.268-.126 3.541-.809 3.541-.809l-.075-1.646s-1.621.511-3.441.449c-1.804-.062-3.707-.194-3.999-2.409a4.523 4.523 0 0 1-.04-.621s1.77.432 4.014.535c1.372.063 2.658-.08 3.965-.236 2.506-.299 4.688-1.843 4.962-3.254.432-2.223.396-5.424.396-5.424zm-3.353 5.59h-2.081V9.057c0-1.075-.452-1.62-1.357-1.62-1 0-1.501.647-1.501 1.927v2.791h-2.069V9.364c0-1.28-.501-1.927-1.502-1.927-.904 0-1.357.545-1.357 1.62v5.099H6.026V8.903c0-1.074.273-1.927.823-2.558.566-.631 1.307-.955 2.228-.955 1.065 0 1.872.41 2.405 1.228l.518.869.519-.869c.533-.818 1.34-1.228 2.405-1.228.92 0 1.662.324 2.228.955.549.631.822 1.484.822 2.558v5.253z"/></svg>`,
        github: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,
        gitlab: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m23.6 9.593-.033-.086L20.3.98a.851.851 0 0 0-.336-.382.862.862 0 0 0-.992.07.86.86 0 0 0-.285.398l-2.212 6.777H7.525L5.313 1.066a.856.856 0 0 0-.285-.398.862.862 0 0 0-.992-.07.854.854 0 0 0-.336.381L.433 9.502l-.032.09a6.066 6.066 0 0 0 2.012 7.01l.01.008.028.02 4.98 3.727 2.462 1.863 1.5 1.132a1.012 1.012 0 0 0 1.22 0l1.5-1.132 2.462-1.863 5.008-3.748.012-.01a6.068 6.068 0 0 0 2.006-7.006z"/></svg>`,
        linkedin: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
        keybase: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10.446 21.371c0 .528-.428.957-.957.957s-.957-.43-.957-.957.428-.957.957-.957.957.43.957.957zm6.024-.096a.903.903 0 0 1-.903.903.903.903 0 0 1-.903-.903.903.903 0 0 1 .903-.903.903.903 0 0 1 .903.903zM20.742 4.09c0-.47-.38-.851-.851-.851s-.851.381-.851.851.38.851.851.851.851-.381.851-.851zm2.03 1.474a2.083 2.083 0 0 1-2.083 2.083 2.083 2.083 0 0 1-2.083-2.083 2.083 2.083 0 0 1 2.083-2.083 2.083 2.083 0 0 1 2.083 2.083zM8.876 2.474c0-.904-.733-1.636-1.637-1.636-.904 0-1.636.732-1.636 1.636s.732 1.636 1.636 1.636c.904 0 1.637-.732 1.637-1.636zM20.612 8.258a4.292 4.292 0 0 0-2.136-1.478l1.567-1.566a2.92 2.92 0 0 0 .861-2.078 2.923 2.923 0 0 0-2.922-2.923 2.92 2.92 0 0 0-2.078.861l-1.565 1.567a4.302 4.302 0 0 0-1.478-2.137A4.297 4.297 0 0 0 10.178 0a4.302 4.302 0 0 0-2.731 4.005v2.074L4.59 2.862A2.795 2.795 0 0 0 2.6 2.03a2.8 2.8 0 0 0-1.988.822A2.803 2.803 0 0 0 .61 6.667l4.123 5.247a4.29 4.29 0 0 0-.485 1.575l-.188 1.662a4.293 4.293 0 0 0 1.108 3.349c.014.014.028.024.042.038l3.396 3.4a3.475 3.475 0 0 0-.01.225c0 1.932 1.571 3.503 3.503 3.503 1.932 0 3.503-1.571 3.503-3.503a3.476 3.476 0 0 0-.085-.744 3.53 3.53 0 0 0 1.755-.703 3.422 3.422 0 0 0 1.234-1.904 3.422 3.422 0 0 0-.104-2.238l1.455-1.455 1.656-.189a4.303 4.303 0 0 0 1.575-.485l5.247 4.123a2.8 2.8 0 0 0 3.815-.002 2.802 2.802 0 0 0-.002-3.978l-3.217-2.857h2.074A4.302 4.302 0 0 0 24 10.178a4.291 4.291 0 0 0-.504-2.683 4.291 4.291 0 0 0-2.884-1.237z"/></svg>`,
        facebook: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
        reddit: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>`,
        email: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67z"/><path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908z"/></svg>`,
      };
      return (
        icons[service] ||
        `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14.851 11.923c-.179-.641-.521-1.246-1.025-1.749-1.562-1.562-4.095-1.563-5.657 0l-4.998 4.998c-1.562 1.563-1.563 4.095 0 5.657 1.562 1.563 4.096 1.561 5.656 0l3.842-3.841.333.009c.404 0 .802-.04 1.189-.117l-4.657 4.656c-.975.976-2.255 1.464-3.535 1.464-1.28 0-2.56-.488-3.535-1.464-1.952-1.95-1.952-5.12 0-7.071l4.998-4.998c.975-.976 2.256-1.464 3.536-1.464 1.279 0 2.56.488 3.535 1.464.493.493.861 1.063 1.105 1.672l-.788.788zm-5.703.147c.178.643.521 1.25 1.026 1.756 1.562 1.563 4.096 1.561 5.656 0l4.999-4.998c1.563-1.562 1.563-4.095 0-5.657-1.562-1.562-4.095-1.563-5.657 0l-3.841 3.841-.333-.009c-.404 0-.802.04-1.189.117l4.656-4.656c.975-.976 2.256-1.464 3.536-1.464 1.279 0 2.56.488 3.535 1.464 1.951 1.95 1.951 5.119 0 7.071l-4.999 4.998c-.975.976-2.255 1.464-3.535 1.464-1.28 0-2.56-.488-3.535-1.464-.494-.495-.863-1.067-1.107-1.678l.788-.785z"/></svg>`
      );
    },
  );

  return {
    templateFormats: ["html", "md", "njk", "webc", "11ty.js", "11ty.ts"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dir: {
      input,
      output,
    },
  };
}
