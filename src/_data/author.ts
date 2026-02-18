interface Author {
  name: string;
  email: string;
  url: string;
  fediverse: string;
  alternates: Record<string, string>;
}

const author: Author = {
  name: "David W. Keith",
  email: "me@dwk.io",
  url: "https://dwk.io/",
  fediverse: "@dwk@xn--4t8h.dwk.io",
  alternates: {
    mastodon: "https://xn--4t8h.dwk.io/@Dwk",
    keybase: "https://keybase.io/dwkeith",
    facebook: "https://www.facebook.com/davidwkeith",
    reddit: "https://www.reddit.com/user/dwkeith",
    gitlab: "https://gitlab.com/davidwkeith",
    github: "https://github.com/davidwkeith",
    linkedin: "https://www.linkedin.com/in/davidwkeith",
    blog: "https://pulletsforever.com",
    // wikipedia: "https://meta.wikimedia.org/wiki/User:Davidwkeith"
  },
};

export default author;
