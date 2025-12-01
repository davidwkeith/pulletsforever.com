---
title: Swift FractionFormatter 1.0
description: Properly format fractions in Swift using Unicode (e.g. "½" rather than "1/2")
date: 2024-06-05
---

With WWDC next week, I decided I should clean up the documentation and release
[Swift FractionFormatter 1.0][source].

A pet peeve of mine is improperly formatted text. Whether that be using strait
quotes when curly quotes are more appropriate, or using curly quotes when primes
are more appropriate. When using recipe apps, all of them allow users to type
"1/2 cup flour" and allow the operating system's text replacement to change the
ingredient to "½ cup flour" and the app will still understand how to scale the
recipe. This works because the `½` glyph is one of the vulgar fractions in the
[Unicode Number Forms][number-forms], which are used to print numbers as
[case fractions][case-fractions] or as roman numerals.

The problem is going the other way. What if the recipe is being converted from
metric to imperial? Should the app round to the nearest ⅛^th^ of a teaspoon?
The correct solution would be to allow arbitrary fractions. And Unicode has a solution
for that too! There are super- and subscript numbers, as well as a fraction slash.
Combine the two and you can write out arbitrary fractions like ⁹⁹⁄₁₀₀.

Now with FractionFormatter Swift developers can parse any user entered fraction,
get a `double`, process it however the app requires, and then write it back using
beautiful Unicode. Fractions will be automatically reduced, so if the string "4/8"
is passed in, the normalized "½" will be returned.

## Quick Tutorial

Using FractionFormatter to format a NSNumber is just like NumberFormatter:

```swift
let fractionFormatter = FractionFormatter()
fractionFormatter.string(from: NSNumber(value: 0.5)) // "½"
fractionFormatter.string(from: NSNumber(value: 0.123)) // "¹²³⁄₁₀₀₀"
```

Reading in a string and converting it to a double is also simple:

```swift
fractionFormatter.double(from: "1 ½") // 1.5
fractionFormatter.double(from: "1 1/2") // 1.5
```

That's really all there is to it, there are functions for converting to and from
different fraction formations, currently the package supports `.Unicode`
(default), and `.BuiltUp` (ugh). In the future FractionFormatter could be
expanded to support `.Stack`, where the numerator is directly on top of the
denominator with a fraction bar between (as seen in LaTeX). I am not exactly
sure how that would output as a Unicode string though.

## Under the Hood

Unicode fractions are a weird beast. They are designed to look best for numbers
inline with text, like ingredient lists in  recipes. Unicode starts by offering
a set of vulgar, or common fractions. Typographically these are know as case fractions
as they are often found in a typesetter's case and are a single character. If
the number is one of these FractionFormatter just returns the correct character.

```swift
static let vulgarFractions = [
    0.1: "⅒",
    0.111111111111111111111: "⅑",
    0.166666666666666666666: "⅙",
    0.125: "⅛",
    0.1428571428571428: "⅐",
    0.2: "⅕",
    0.25: "¼",
    0.333333333333333333333: "⅓",
    0.375: "⅜",
    0.4: "⅖",
    0.5: "½",
    0.6: "⅗",
    0.625: "⅝",
    0.666666666666666666666: "⅔",
    0.75: "¾",
    0.8: "⅘",
    0.833333333333333333333: "⅚",
    0.875: "⅞"
]
```

Otherwise the number is normalized as a reduced numerator and denominator,
which are printed as super- and subscripted number strings separated by
the fraction slash glyph `⁄`. The reverse is done for parsing, and both
Unicode and traditional built up fractions are supported.

|          |                                |
|----------|--------------------------------|
| Package  | [Swift Package Index][package] |
| Source   | [GitLab][source]               |

[source]: https://gitlab.com/davidwkeith/fractionformatter
[package]: https://swiftpackageindex.com/davidwkeith/FractionFormatter
[number-forms]: https://en.wikipedia.org/wiki/Number_Forms
[case-fractions]: http://zuga.net/articles/typography-what-is-a-case-fraction/
