export const data = {
  permalink: "/humans.txt",
  eleventyExcludeFromCollections: true,
};

export function render() {
  return `/* TEAM */
\tDavid W. Keith @dwk.io

/* THANKS */

/* SITE */

Build Date: ${new Date().toISOString()}
`;
}
