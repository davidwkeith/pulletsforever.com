---
title: "Running JSLint with Safari’s JavaScript Core"
date: 2009-07-08T04:42:44.001Z
tags: [javascript, code]
---

I have created a small launcher script for JavaScript Core (Safari’s Nitro JavaScript Engine)

It gives Mac users the ability to run JSLint from the command line without installing anything extra, thus making more likely that we will incorporate JSLint into our custom build scripts. (Should also run on Windows, but I don’t have a box to validate that with at the moment.)

Just add the code below to the latest copy of [JSLint](http://www.JSLint.com/fulljslint.js) to be able to use it with jsc.

```javascript
// jsc.js
// 2009-07-08
/*
Copyright (c) 2002 Douglas Crockford  ([www.JSLint.com](http://www.jslint.com/)) JSC Edition
Copyright (c) 2009 Apple Inc.
*/
// This is the JSC companion to fulljslint.js.
/*extern JSLINT */
(function (a) {
    if (!a[0]) {
    print('Usage: jslint.js -- "$(cat myFile.js)"');
    quit(1);
}
if (!JSLINT(a[0], {bitwise: true, eqeqeq: true, immed: true,
    newcap: true, nomen: true, onevar: true, plusplus: true,
    regexp: true, undef: true, white: true})) {
        for (var i = 0; i < JSLINT.errors.length; i += 1) {
            var e = JSLINT.errors[i];
            if (e) {
                print('Lint at line ' + (e.line + 1) + ' character ' +
                    (e.character + 1) + ': ' + e.reason);
                print((e.evidence || '').
                replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1"));
                print('');
            }
        }
    quit(2);
} else {
    print("jslint: No problems found.");
    quit();
}
}(arguments));
```
