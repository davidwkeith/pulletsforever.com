import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";
import { footnote } from "@mdit/plugin-footnote";
import { mark } from "@mdit/plugin-mark";
import { sup } from "@mdit/plugin-sup";

export default function (eleventyConfig: EleventyConfig): void {
  const mdLib = markdownIt({
    html: true,
    typographer: true,
  });

  mdLib
    .use(footnote)
    .use(mark)
    .use(sup)
    .use(markdownItAnchor, {
      permalink: markdownItAnchor.permalink.linkInsideHeader({
        placement: "after",
        class: "header-anchor",
        symbol: '<span aria-hidden="true">🔗</span>',
        renderAttrs: (slug: string) => ({
          "aria-label": `Link to section: ${slug.replace(/-/g, " ")}`,
        }),
      }),
      level: [1, 2, 3, 4],
      slugify: eleventyConfig.getFilter("slugify") as (
        s: string,
      ) => string,
    });

  eleventyConfig.setLibrary("md", mdLib);
}
