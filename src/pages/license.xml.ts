/**
 * RSL (Really Simple Licensing) document at /license.xml.
 * Declares CC BY 4.0 with attribution as the default site-wide license.
 */

export function GET() {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
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
  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
