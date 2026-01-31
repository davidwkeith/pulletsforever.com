---
title: "CoverLeaf magazines can still be read for free"
date: 2010-08-18T03:11:12.917Z
tags: [hacks, web]
---

In my hacking for the RSS Feed Generator I noticed that the images of the magazine pages used by the iPad version of CoverLeaf are still freely available to anyone that wants them.

* [makevol23_0001.jpg](http://m-cdn.dashdigital.com/make/vol23/data/imgpages/mobile2/makevol23_0001.jpg)

* [makevol23_0002.jpg](http://m-cdn.dashdigital.com/make/vol23/data/imgpages/mobile2/makevol23_0002.jpg)

* [makevol23_0003.jpg](http://m-cdn.dashdigital.com/make/vol23/data/imgpages/mobile2/makevol23_0003.jpg)

* [makevol23_0004.jpg](http://m-cdn.dashdigital.com/make/vol23/data/imgpages/mobile2/makevol23_0004.jpg)

* [makevol23_0005.jpg](http://m-cdn.dashdigital.com/make/vol23/data/imgpages/mobile2/makevol23_0004.jpg)

Using the same pattern as the PDFs that I described [earlier](https://medium.com/pullets-forever/read-make-on-your-ipad-f20993f4d5a8#.xrb5frkrd) you can construct URLs for any CoverLeaf magazine you want to read:

* [readymade20100809_0001.jpg](http://m-cdn.dashdigital.com/readymade/20100809/data/imgpages/mobile2/readymade20100809_0001.jpg)

* [fastcompany201009_0001.jpg](http://m-cdn.dashdigital.com/fastcompany/201009/data/imgpages/mobile2/fastcompany201009_0001.jpg)

**UPDATE:** A friend pointed me to CURL’s man page for a better way to download images, this script will output images in the same directory that is is run from.

`./download.sh make vol23`

```bash
#!/usr/bin/env bash
MAX_PAGES='0200';
curl --fail --remote-name [http://m-cdn.dashdigital.com/$1/$2/data/imgpages/mobile2/$1$2[0001-$MAX_PAGES].jpg;](http://m-cdn.dashdigital.com/$1/$2/data/imgpages/mobile2/$1$2[0001-$MAX_PAGES].jpg;)
```

Then you just take the folder of images and make a PDF (one action Automator workflow) and [add the PDF to iTunes](http://www.dougscripts.com/itunes/scripts/scripts07.php?page=1).
