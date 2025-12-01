import markdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import { footnote } from "@mdit/plugin-footnote";
import { mark } from "@mdit/plugin-mark";
import { sup } from "@mdit/plugin-sup";
// import embed from "@dwk/markdown-it-embed";

export default function(eleventyConfig) {
  // Customize Markdown library settings:
  let mdLib = markdownIt({
    typographer: true,
  });

  eleventyConfig.amendLibrary("md", mdLib => {
    mdLib.use(footnote)
         .use(mark)
         .use(sup)
        //  .use(embed)
         .use(markdownItAnchor, {
      permalink: markdownItAnchor.permalink.ariaHidden({
        placement: "after",
        class: "header-anchor",
        symbol: "#",
        ariaHidden: false,
      }),
      level: [1,2,3,4],
      slugify: eleventyConfig.getFilter("slugify")
    });
  });

  eleventyConfig.setLibrary("md", mdLib);
}