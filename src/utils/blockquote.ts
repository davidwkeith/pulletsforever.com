/**
 * Blockquote node override for Markdoc, ported from the Eleventy
 * markdown-it stack. Adds two behaviours on top of the default
 * blockquote rendering:
 *
 * 1. Aside / pullquote — a blockquote whose first paragraph begins with
 *    `[!aside]` renders as `<blockquote class="aside">` and the marker
 *    is stripped. Plain blockquotes (no marker) render as standard
 *    inline blockquotes.
 *
 * 2. Attribution footer — when a blockquote's last paragraph begins
 *    with an em-dash, en-dash, or `--` (the latter is rewritten to
 *    `—` by the typography patch before this runs), the leading dash
 *    is stripped and the paragraph is re-tagged as `<footer>`.
 */

import Markdoc from "@markdoc/markdoc";
import type { Config, Node } from "@markdoc/markdoc";

const { Tag, nodes } = Markdoc;

const ASIDE_RE = /^\s*\[!aside\]\s*/;
const ATTRIB_RE = /^\s*(?:—|–|--)\s*/;

export const blockquoteNode = {
  ...nodes.blockquote,
  transform(node: Node, config: Config) {
    const children = node.transformChildren(config);

    let isAside = false;
    const first = children[0];
    if (first instanceof Tag && first.name === "p") {
      const head = first.children[0];
      if (typeof head === "string" && ASIDE_RE.test(head)) {
        isAside = true;
        const stripped = head.replace(ASIDE_RE, "");
        if (stripped) {
          first.children[0] = stripped;
        } else {
          first.children.shift();
          if (first.children.length === 0) children.shift();
        }
      }
    }

    const last = children[children.length - 1];
    if (last instanceof Tag && last.name === "p") {
      const head = last.children[0];
      if (typeof head === "string" && ATTRIB_RE.test(head)) {
        const stripped = head.replace(ATTRIB_RE, "");
        if (stripped) last.children[0] = stripped;
        else last.children.shift();
        last.name = "footer";
      }
    }

    return new Tag("blockquote", isAside ? { class: "aside" } : {}, children);
  },
};
