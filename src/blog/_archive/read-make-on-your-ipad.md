---
title: Read MAKE on your iPad
date: 2010-07-31T04:48:26.142Z
tags: [ web ]
---

I really wanted to read MAKE on my iPad, and while I can read it through CoverLeaf at http://www.make-digital.com/ the experience was not that great and required me to be online. While hacking around with the iPad version I realized quickly that it was just serving up JPG’s for each page, conveniently named 001, 002, etc. My first thought was to just download each page until I got a 404 error and make a PDF to read in iBooks from all the JPG’s, but as I investigated further I found the JPG’s were hosted at http://m-cdn.dashdigital.com/make/vol23/ which is CoverLeaf’s old web reading site. The interesting thing about the old site is it provides a PDF download link.

As an individual user, the PDF link is all I needed, but I wanted to share my findings with others, so I compiled all the PDF downloads for MAKE into one RSS feed, which is now available at feed://pulletsforever.com/feeds/make.rss To read the magazine just subscribe to the feed in iTunes and sync the downloads to iBooks (or your preferred reader) on your iPad.

Unfortunately CoverLeaf does not provide any authentication for their download links so anyone can read the magazine without a subscription. Given that MAKE encourages hacking I feel OK in publishing the feed and letting everyone know they can subscribe to the Digital Only version of MAKE for [$9.99 per year](http://makezine.com/subscribe/). If CoverLeaf or Make starts to host the RSS feed of the PDF’s I will redirect my feed to theirs so you won’t miss it.

**UPDATE:** I also subscribe to ReadyMade, which is also hosted on CoverLeaf but does not have a PDF download option. Given what I learned from Make I tried to construct a URL for a PDF of ReadyMade and found out that there is one on the server. It looks like for any given magazine on CoverLeaf you can get the download of the PDF by constructing the URL as follows:

```
http://m-cdn.dashdigital.com/<magazine_name>/<volume_identifier>/data/<magazine_name><volume_identifier>-dl.pdf
```

I have verified this with a few magazines that I do not subscribe to.

This makes it very easy to create your own RSS feed and put any CoverLeaf magazine on your iPad.
