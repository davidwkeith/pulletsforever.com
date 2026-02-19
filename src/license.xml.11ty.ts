export const data = {
  eleventyExcludeFromCollections: true,
  permalink: "/license.xml",
};

export function render(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<rsl xmlns="https://rslstandard.org/rsl">
  <content url="/">
    <license>
      <permits type="usage">all</permits>
      <payment type="attribution" />
    </license>
    <copyright type="person" contactUrl="https://pulletsforever.com">David W. Keith</copyright>
    <standard>https://creativecommons.org/licenses/by/4.0/</standard>
  </content>
</rsl>`;
}
