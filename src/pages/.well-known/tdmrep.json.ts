/**
 * TDM Reservation Protocol — declares this site reserves text-and-data-mining
 * rights but allows reuse under CC BY 4.0.
 */

export function GET() {
  const body = [
    {
      location: "/",
      "tdm-reservation": 1,
      "tdm-policy": "https://creativecommons.org/licenses/by/4.0/",
    },
  ];

  return new Response(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json" },
  });
}
