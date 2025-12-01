---
title: Bloggin'
date: 2024-05-01
tags: [web-tech]
---
I decided to start bloggin' again, which might have been an excuse to evaluate the state of Static Site Generators, tooling that I worked with at Nest on at Apple. It was more than a bunch of Perl scripts, honest.

So that means I need to update my tooling to something I like. I have absolutely spent more time converting what little I have of a blog from platform to platform, but, if I'm to get serious about bloggin' again, I need something both easy to use, and highly flexible to scratch my semantic HTML itch.

For building the site I settled on [11ty](https://www.11ty.dev/) for the following reasons:
- Fast: [performance on par with Hugo](https://www.11ty.dev/docs/performance/#build-performance)
- Node based: The web is already a mess of technologies, while Node has significant difference from browser JavaScript, this is less context switching.
- [Vibrant community](https://www.11ty.dev/docs/community/): I am likely to find plugins that are actively maintained
- Template language agnostic: long form is Markdown of course, but the actual pages still need templates. I'm using [Nunjunks](https://mozilla.github.io/nunjucks/) for now, but am looking into using [WebC](https://www.11ty.dev/docs/languages/webc/).

Hosting was another issue to solve, I had been using GitLab pages, which is great for basic sites, but static web hosts should support everything GitLab does plus headers for security. I was in the process of moving off of Google Domains ([RIP](https://killedbygoogle.com)) to CloudFlare and evaluated their [Pages](https://pages.cloudflare.com) product. Everything I needed and behind a service I was already using. Sold! You now get my free business.

Anyways, no idea where this is going, but expect new posts every once in a while, I still have a bunch to clean up around here.
