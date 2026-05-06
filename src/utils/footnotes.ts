/**
 * Footnote support for Markdoc, ported from the previous Eleventy +
 * markdown-it-footnote stack. Markdoc has no built-in footnote node,
 * so we register markdown-it-footnote on Markdoc's shared tokenizer
 * and rewrite the resulting tokens into Markdoc tag tokens that we
 * render below.
 */

import Markdoc from "@markdoc/markdoc";
import type { Config, Node } from "@markdoc/markdoc";
// @ts-expect-error - markdown-it-footnote ships no types.
import footnotePlugin from "markdown-it-footnote";

const { Tag, Tokenizer } = Markdoc;

type Token = {
  type: string;
  tag?: string;
  nesting?: number;
  content?: string;
  children?: Token[] | null;
  meta?: { id: number; subId?: number; label?: string } & Record<
    string,
    unknown
  >;
};

let patched = false;

/**
 * Patch Markdoc's Tokenizer prototype to register markdown-it-footnote
 * on the underlying markdown-it parser and post-process the resulting
 * tokens into Markdoc tag tokens (`fnref`, `fnanchor`, `fn`, `fnblock`).
 *
 * Idempotent — safe to call from multiple entry points.
 */
export function applyFootnotePatch(): void {
  if (patched) return;
  patched = true;
  const proto = Tokenizer.prototype as unknown as {
    tokenize(content: string): Token[];
    parser: { use(plugin: unknown): unknown };
    _footnoteAdded?: boolean;
  };
  const origTokenize = proto.tokenize;
  proto.tokenize = function (content: string): Token[] {
    if (!this._footnoteAdded) {
      this.parser.use(footnotePlugin);
      this._footnoteAdded = true;
    }
    return rewriteFootnoteTokens(origTokenize.call(this, content));
  };
}

function attrsToArr(attrs: Record<string, string>) {
  return Object.entries(attrs).map(([name, value]) => ({
    type: "attribute",
    name,
    value,
  }));
}

function tagOpen(tag: string, attrs: Record<string, string> = {}): Token {
  return {
    type: "tag_open",
    tag: "",
    nesting: 1,
    meta: {
      id: 0,
      tag,
      attributes: attrsToArr(attrs),
    } as Token["meta"],
  };
}

function tagClose(tag: string): Token {
  return {
    type: "tag_close",
    tag: "",
    nesting: -1,
    meta: { id: 0, tag, attributes: [] } as Token["meta"],
  };
}

/**
 * Book-style typographical footnote indicators, in order: `*`, `†`, `‡`,
 * `§`, `¶`, `‖`. Past the sixth footnote the symbol doubles (`**`, `††`,
 * etc.), then triples, and so on — matches the convention used in
 * traditional print typography and on the production site.
 */
const FOOTNOTE_SYMBOLS = ["*", "†", "‡", "§", "¶", "‖"];

function symbolFor(index: number): string {
  const base = FOOTNOTE_SYMBOLS[index % FOOTNOTE_SYMBOLS.length];
  const repeat = Math.floor(index / FOOTNOTE_SYMBOLS.length) + 1;
  return base.repeat(repeat);
}

function rewriteInline(children: Token[]): Token[] {
  const out: Token[] = [];
  for (const child of children) {
    if (child.type === "footnote_ref" && child.meta) {
      const id = child.meta.id;
      const n = String(id + 1);
      const sub = child.meta.subId ?? 0;
      const refSuffix = sub > 0 ? `:${sub}` : "";
      const symbol = symbolFor(id);
      out.push(
        tagOpen("fnref", { n, refSuffix, symbol }),
        tagClose("fnref"),
      );
      continue;
    }
    out.push(child);
  }
  return out;
}

function rewriteFootnoteTokens(tokens: Token[]): Token[] {
  const out: Token[] = [];
  // When a footnote_open has just been seen, the next inline token's first
  // child should be a symbol tag (the visible gutter marker for this
  // footnote). Tracking the symbol in this variable lets us inject the
  // marker into the AST before Markdoc parses it, instead of trying to
  // mutate transformed children later (which can race with async
  // children() returns).
  let pendingSymbol: string | null = null;
  for (const token of tokens) {
    if (token.type === "inline" && Array.isArray(token.children)) {
      const rewritten = rewriteInline(token.children);
      if (pendingSymbol !== null) {
        rewritten.unshift(
          tagOpen("fnsymbol", { symbol: pendingSymbol }),
          tagClose("fnsymbol"),
        );
        pendingSymbol = null;
      }
      token.children = rewritten;
      out.push(token);
      continue;
    }
    switch (token.type) {
      case "footnote_block_open":
        out.push(tagOpen("fnblock"));
        break;
      case "footnote_block_close":
        out.push(tagClose("fnblock"));
        break;
      case "footnote_open": {
        const meta = token.meta;
        if (!meta) {
          out.push(tagOpen("fn", { n: "0", refSuffix: "" }));
          pendingSymbol = "*";
          break;
        }
        const id = meta.id;
        const symbol = symbolFor(id);
        out.push(
          tagOpen("fn", {
            n: String(id + 1),
            refSuffix: (meta.subId ?? 0) > 0 ? `:${meta.subId}` : "",
          }),
        );
        pendingSymbol = symbol;
        break;
      }
      case "footnote_close":
        out.push(tagClose("fn"));
        break;
      case "footnote_anchor": {
        // markdown-it-footnote emits this as a block-level token sandwiched
        // inside the footnote's last paragraph (between paragraph_open and
        // paragraph_close), so it ends up nested under the paragraph node.
        const meta = token.meta;
        if (!meta) {
          out.push(token);
          break;
        }
        const n = String(meta.id + 1);
        const sub = meta.subId ?? 0;
        out.push(
          tagOpen("fnanchor", { n, refSuffix: sub > 0 ? `:${sub}` : "" }),
          tagClose("fnanchor"),
        );
        break;
      }
      default:
        out.push(token);
    }
  }
  return out;
}

/**
 * Markdoc tag schemas that render the rewritten footnote tokens to the
 * same HTML structure markdown-it-footnote produces by default.
 */
export const footnoteTags = {
  fnref: {
    attributes: {
      n: { type: String, required: true },
      refSuffix: { type: String, default: "" },
      symbol: { type: String, required: true },
    },
    transform(node: Node) {
      const n = node.attributes.n as string;
      const refSuffix = (node.attributes.refSuffix as string) ?? "";
      const symbol = node.attributes.symbol as string;
      // The marker character lives both as text content (for copy-paste
      // and screen readers) and as a `data-fn-mark` attribute that CSS
      // mirrors via `::before`, so the marker still renders even if a
      // browser quirk strips short text content from the link.
      // The empty `<a class="footnote-anchor">` sibling is the backref
      // target; landing on it (rather than the visible `<sup>`) keeps the
      // marker from scrolling under the viewport's top edge.
      return new Tag("sup", { class: "footnote-ref" }, [
        new Tag(
          "a",
          { href: `#footnote${n}`, "data-fn-mark": symbol },
          [symbol],
        ),
        new Tag(
          "a",
          { id: `footnote-ref${n}${refSuffix}`, class: "footnote-anchor" },
          [],
        ),
      ]);
    },
  },
  fnanchor: {
    attributes: {
      n: { type: String, required: true },
      refSuffix: { type: String, default: "" },
    },
    transform(node: Node) {
      const n = node.attributes.n as string;
      const refSuffix = (node.attributes.refSuffix as string) ?? "";
      return [
        " ",
        new Tag(
          "a",
          {
            href: `#footnote-ref${n}${refSuffix}`,
            class: "footnote-backref",
          },
          ["⏎"],
        ),
      ];
    },
  },
  fnblock: {
    transform(node: Node, config: Config) {
      // The "-dwk" signature is rendered here so that, in posts with
      // footnotes, the order is body → signature → hr → footnotes. In
      // footnote-less posts the signature is emitted by the layout
      // (`src/pages/[slug].astro`) and feed renderer instead.
      return [
        new Tag("p", { class: "signature" }, ["-dwk"]),
        new Tag("hr", { class: "footnotes-sep" }),
        new Tag("section", { class: "footnotes" }, [
          new Tag(
            "ol",
            { class: "footnotes-list" },
            node.transformChildren(config),
          ),
        ]),
      ];
    },
  },
  fn: {
    attributes: {
      n: { type: String, required: true },
      refSuffix: { type: String, default: "" },
    },
    transform(node: Node, config: Config) {
      const n = node.attributes.n as string;
      const refSuffix = (node.attributes.refSuffix as string) ?? "";
      // The gutter symbol is injected as an `fnsymbol` tag at the start of
      // the first inline child during tokenization, so we don't need to
      // touch children here.
      return new Tag(
        "li",
        { id: `footnote${n}${refSuffix}`, class: "footnote-item" },
        node.transformChildren(config),
      );
    },
  },
  fnsymbol: {
    attributes: { symbol: { type: String, required: true } },
    transform(node: Node) {
      const symbol = node.attributes.symbol as string;
      return new Tag(
        "span",
        { class: "footnote-symbol", "data-fn-mark": symbol },
        [symbol],
      );
    },
  },
};
