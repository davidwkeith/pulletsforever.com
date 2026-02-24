import markdownItAnchor from "markdown-it-anchor";
import { footnote } from "@mdit/plugin-footnote";
import { mark } from "@mdit/plugin-mark";
import { sup } from "@mdit/plugin-sup";

export default function (eleventyConfig: EleventyConfig): void {
  eleventyConfig.amendLibrary("md", (mdLib) => {
    mdLib.set({ html: true, typographer: true });
    mdLib.use(footnote).use(mark).use(sup);

    // Use typographic footnote symbols: * † ‡ § ‖ ¶, then doubled
    const FOOTNOTE_SYMBOLS = ["*", "\u2020", "\u2021", "\u00A7", "\u2016", "\u00B6"];
    function footnoteSymbol(n: number): string {
      // n is 0-based index
      const repeat = Math.floor(n / 6) + 1;
      return FOOTNOTE_SYMBOLS[n % 6].repeat(repeat);
    }

    mdLib.renderer.rules.footnote_caption = (tokens, idx) => {
      return footnoteSymbol(tokens[idx].meta.id);
    };

    mdLib.renderer.rules.footnote_anchor = (tokens, idx) => {
      const meta = tokens[idx].meta;
      const symbol = footnoteSymbol(meta.id);
      const anchorName = meta.id + 1;
      let suffix = "";
      if (meta.subId > 0) suffix = `:${meta.subId}`;
      return ` <a href="#footnote-ref${anchorName}${suffix}" class="footnote-backref">\u23CE</a>`;
    };

    mdLib.renderer.rules.footnote_open = (tokens, idx) => {
      const id = tokens[idx].meta.id;
      const symbol = footnoteSymbol(id);
      return `<li id="footnote${id + 1}" class="footnote-item"><span class="footnote-symbol">${symbol}</span> `;
    };

    mdLib.renderer.rules.footnote_block_open = () =>
      '<section class="footnotes">\n<ol class="footnotes-list">\n';

    // Warn when links are missing title attributes
    const defaultLinkOpen =
      mdLib.renderer.rules.link_open ||
      ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
    mdLib.renderer.rules.link_open = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const href = token.attrGet("href") || "";
      // Skip anchor links (#...), mailto, and footnote refs
      if (!href.startsWith("#") && !href.startsWith("mailto:") && !token.attrGet("title")) {
        const file = env?.page?.inputPath || "unknown file";
        console.warn(`⚠ Link missing title: [${href}] in ${file}`);
      }
      return defaultLinkOpen(tokens, idx, options, env, self);
    };

    mdLib.use(markdownItAnchor, {
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
  });

  // Convert "> \n> -- Attribution" into <footer> inside blockquotes.
  // In markdown, use a blank ">" line before the attribution:
  //   > Quote text
  //   >
  //   > --Author Name
  eleventyConfig.addTransform("blockquote-footer", (content) => {
    if (typeof content !== "string" || !content.includes("<blockquote>")) return content;
    return content.replace(
      /<blockquote>([\s\S]*?)<\/blockquote>/g,
      (match, inner) => {
        // Match a <p> whose text starts with an en/em dash or --
        // and replace the entire <p>...</p> with <footer>...</footer>
        const replaced = inner.replace(
          /<p>\s*(?:\u2013|\u2014|–|—|--)\s*([\s\S]*?)<\/p>/,
          "<footer>$1</footer>",
        );
        if (replaced !== inner) {
          return `<blockquote>${replaced}</blockquote>`;
        }
        return match;
      },
    );
  });
}
