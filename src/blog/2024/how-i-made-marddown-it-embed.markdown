---
title: Introducing markdown-it-embed
date: 2024-26-06
tags: javascript markdown
draft: true
---

- started with markdown-it-plugin-template
- Updated it per the instructions
- Added my test case for the plugin I wanted with [diffable-html](https://www.npmjs.com/package/diffable-html)
  ```Markdown
  Basic embed
  .
  @[A classic rick-roll](https://www.youtube-nocookie.com/watch?v=dQw4w9WgXcQ "Super Cool Video")
  .
  <p>
    <figure>
      <iframe title="A classic rick-roll" src="https://www.youtube-nocookie.com/watch?v=dQw4w9WgXcQ" frameborder=0></iframe>
      <figcap>Super Cool Video</figcap>
    </figure>
  </p>
  .
  ```
- Asked GitHub Co-pilot to "Create a simple markdown-it plugin in Typescript that converts the folowing Markdown `@[A Rick Roll Video](https://www.youtube.com/watch?v=dQw4w9WgXcQ "Rick Roll")` into an html figure element with an iframe and figcap"
- Pasted the code into my plugin and ran the tests
- Realized I forgot to specify what should be done with text between the square brackets, so I added support the for the iframe title attribute, which is where the [alternate text should go](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#accessibility).
- 