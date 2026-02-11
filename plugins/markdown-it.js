import markdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import { footnote } from "@mdit/plugin-footnote";
import { mark } from "@mdit/plugin-mark";
import { sup } from "@mdit/plugin-sup";

export default function(eleventyConfig) {
  // Customize Markdown library settings:
  let mdLib = markdownIt({
    html: true,        // Allow raw HTML (for <details>, <summary>, etc.)
    typographer: true,
  });

  mdLib.use(footnote)
       .use(mark)
       .use(sup)
       .use(markdownItAnchor, {
    permalink: markdownItAnchor.permalink.linkInsideHeader({
      placement: "after",
      class: "header-anchor",
      symbol: "<span aria-hidden=\"true\">🔗</span>",
      renderAttrs: (slug) => ({ "aria-label": `Link to section: ${slug.replace(/-/g, ' ')}` }),
    }),
    level: [1,2,3,4],
    slugify: eleventyConfig.getFilter("slugify")
  });

  eleventyConfig.setLibrary("md", mdLib);
}
