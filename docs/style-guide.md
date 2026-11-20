# Style Guide

How Pullets Forever posts sound, drawn from the 2025–2026 posts. For frontmatter, images and publishing mechanics see [content-guide.md](content-guide.md).

## Voice

First person, plainspoken, a little wry. Write like an engineer explaining something over dinner, not like a press release. Lots of dry humor, much of it at my own expense:

> It has been well over a decade since I first started playing around with emoji domains and in that time I have learned nothing.

> I've been teaching this curriculum for years, and I'm nowhere near that accurate. Just ask my students.

Earn authority with lived experience, not titles: Apple campus in 2007, product launches at Nest, years of teaching CS through TEALS, dysgraphia. Mention it when it bears on the argument, and only then.

## Openings

Open on a scene, a confession, or a blunt hook. Never on background.

- Scene: "Standing in the dairy aisle, staring at fourteen brands of sour cream…"
- Confession: "The keyboard is the reason you're reading me at all."
- Hook: "Claude really didn't want to write an application in Brainfuck."

Follow up with a short reframe, often two clipped sentences: "The problem isn't knowledge. The problem is math."

## Argument

Opinion posts make one claim, and say it outright, often bolded on its own line:

> **Typing, not handwriting, is the foundational literacy of the future — and it is also the more universal and more humane of the two.**

Then steelman the other side ("I'll grant all of it."), and only then rebut. Back claims with concrete numbers ("5 errors in 3,617 messages", "ten hours. On one assignment."). Say plainly where the tool or argument falls short. Every how-to post has a "what you still own" or "is it better? Sometimes." beat.

## Structure

- **Titles:** Title Case, punchy, often two short sentences in tension: "Handwriting Is an Inheritance. Typing Is a Right." / "20 Years of Banning Phones. We Don't Have That Long for AI."
- **Description:** one or two sentences that state the claim or the payoff, not the topic.
- **Headings:** short, sentence case, conversational ("Ask a novelist", "What a sane curriculum does", "Why it works"). No "Introduction" or "Conclusion".
- **Paragraphs:** short. One idea each. A one-line paragraph is fine for emphasis.
- **Bold run-in leads** for a sequence of parallel items (layers, lessons, rules), each a full paragraph: "**1. Pedagogical identity.** The Gem's system prompt…"
- **Bullet lists** only for genuinely list-shaped things: takeaways, recommendations, citations. Not for argument.
- **Length:** essays 1,500–2,500 words; project announcements ~500.

## Links

Link generously; readers click everything. Every product, person, study, spec and quote gets a link to the primary source. Every link gets a title attribute in the form `"Page Title — Publisher"`:

```markdown
[Super Bot Fight Mode](https://developers.cloudflare.com/bots/get-started/super-bot-fight-mode/ "Super Bot Fight Mode — Cloudflare Docs")
```

- Books go to Bookshop.org. Concepts go to Wikipedia. Docs go to the vendor's docs, not a blog about them.
- Check every URL before publishing. A 404 means the homework wasn't done.

## Footnotes

Use footnotes for asides that are fun but off the main line, and for citation piles. They're often where the best jokes go:

> [^1]: When AIs start volunteering, we are in trouble.

## Endings

End on a short line that calls back to the opening or flips the thesis into a punchline. No summary paragraph.

- "The best feedback is the feedback that actually gets written."
- "No guestbook, but PRs welcome."
- "That's why a quarter-million-dollar Olivetti exists."

## Mechanics

- Em dashes with spaces around them ( — ). Older posts use `--`; don't copy that.
- Numerals for measurements and counts ("17 Workers", "37 seconds"); words for small casual counts ("three agents").
- Code, commands, file names, flags and values in backticks.
- Name AI models when the model matters to the story (e.g., comparing them); otherwise say "Claude" or "the agent".
- Tags are lowercase and few (`ai`, `education`, `cloudflare`, `projects`…).
- Hero image with a descriptive, literal `imageAlt`.

## Don't

- Don't open with context, definitions, or "In this post I will…".
- Don't hedge a claim into mush; concede specific points instead.
- Don't use marketing voice ("leverage", "seamless", "game-changer").
- Don't stack bullets where a paragraph would argue better.
- Don't summarize the post at the end.
