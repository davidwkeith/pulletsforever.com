export const data = {
  eleventyExcludeFromCollections: true,
  permalink: "/.well-known/tdmrep.json",
};

export function render(): string {
  return JSON.stringify(
    [
      {
        location: "/",
        "tdm-reservation": 1,
        "tdm-policy": "https://creativecommons.org/licenses/by/4.0/",
      },
    ],
    null,
    2,
  );
}
