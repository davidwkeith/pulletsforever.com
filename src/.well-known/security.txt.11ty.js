export const data = {
  eleventyExcludeFromCollections: true,
  permalink: "/.well-known/security.txt",
};

export function render() {
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1);

  return `Contact: mailto:security@pulletsforever.com
Expires: ${expiry.toISOString()}
Preferred-Languages: en
Canonical: https://pulletsforever.com/.well-known/security.txt
# TODO: Digitally Sign https://www.rfc-editor.org/rfc/rfc9116#section-2.3`;
}
