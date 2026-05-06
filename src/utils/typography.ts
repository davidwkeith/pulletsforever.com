/**
 * Typographic substitutions for Markdoc, applied at tokenization time.
 *
 * markdown-it's built-in `typographer` treats `--` as an en-dash and only
 * `---` as an em-dash. On this site `--` is consistently authored to mean
 * em-dash (the Pandoc convention), so we run our own walk over text tokens
 * and convert `--` and `---` directly to `—`.
 *
 * Substitutions skip code spans, fenced blocks, and HTML so that hyphenated
 * identifiers inside code samples are preserved.
 */

import Markdoc from "@markdoc/markdoc";

const { Tokenizer } = Markdoc;

type Token = {
  type: string;
  content?: string;
  children?: Token[] | null;
};

let patched = false;

export function applyTypographyPatch(): void {
  if (patched) return;
  patched = true;
  const proto = Tokenizer.prototype as unknown as {
    tokenize(content: string): Token[];
  };
  const origTokenize = proto.tokenize;
  proto.tokenize = function (content: string): Token[] {
    return rewriteText(origTokenize.call(this, content));
  };
}

function substitute(text: string): string {
  // `---` first so it's not consumed as `--` + `-`.
  return text.replace(/---/g, "—").replace(/--/g, "—");
}

function rewriteText(tokens: Token[]): Token[] {
  for (const token of tokens) {
    if (token.type === "inline" && Array.isArray(token.children)) {
      for (const child of token.children) {
        if (child.type === "text" && typeof child.content === "string") {
          child.content = substitute(child.content);
        }
      }
    }
  }
  return tokens;
}
