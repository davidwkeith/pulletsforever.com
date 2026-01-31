---
title: "MAKE RSS Feed Generator"
date: 2010-08-18T05:33:45.655Z
tags: [web, php]
---

I created a simple tool that will auto generate a URL to the RSS feed of your subscription to MAKE. To learn how I did it, read on.

Recently, the RSS feed [I created](/read-make-on-your-ipad-f20993f4d5a8#.35fqzuqe3) started returning 404 errors. This was completely expected as Sean Michael Ragan pointed out that CoverLeaf was working around the clock on a fix. Fearing the worst, I logged into [make-digital.com](http://make-digital.com) and found the PDF download link was still there.

Unfortunately CoverLeaf still does not have an RSS feed that you can subscribe to with iTunes for easy syncing to your iPad. Curiosity got the best of me. I wanted to figure out how they had secured the download. I clicked on the link and my copy of MAKE was downloaded from a URL similar to:

```
http://www.make-digital.com/51d3e7af247686fe5b2c99d6e0a430ea/4c6a3968/make/vol23/data/makevol23-dl.pdf?lm=1280161230000
```
That is some security! The first hexadecimal number I have yet to figure out; it seems to be some randomly generated ID. The second one is a [UNIX timestamp](http://en.wikipedia.org/wiki/Unix_time) that is likely used to identify when the link should expire. The URL continues with magazine name, issue identifier, and payload. Finally there is an lm variable on the end. Again this is a mystery, but the number is the same on most links in the magazine, so I assume it is for tracking purposes. A [Google search](http://www.google.com/search?q=1280161230000&hl=en&rls=en&filter=0) for the number results in hits on [make-digital.com](http://make-digital.com) only and it seems to be optional.

But where was this URL coming from? I opened up Safari’s trusty [Web Inspector](http://developer.apple.com/safari/library/documentation/AppleApplications/Conceptual/Safari_Developer_Guide/DebuggingYourWebsite/DebuggingYourWebsite.html#//apple_ref/doc/uid/TP40007874-CH8-SW1) and started poking around under the hood of the web app and quickly found the following code:

```html
<!-- navbar/download/inputCustomHeader.ftl -->
  <div id="download">
  <div >
    <form name="download_form" id="download_form" action="/make/vol23/Download_submit.action?lm=1280161230000" method="post">
      <p>
          <input type="radio" name="download" id="download_all" value="all" checked style="display:none;" />
          <label for="download_all"><strong>pdf format (73Mb)</strong></label>
      </p>
      <p>
        <div id="download_pdf">
          <span>begin pdf download</span>
        </div>
      </p>
    </form>
  </div>
</div>
<script type="text/javascript">
  Download.init();
</script>
<!-- navbar/download/input.ftl -->
<!-- navbar/download/inputCustomFooter.ftl -->
<!-- AjaxContainer.ftl -->
```

This is a snippet of HTML that the app downloaded using a XMLHttpRequest, commonly referred to as an AJAX request. The form submits a request to the server for a PDF that matches the download criteria, which is hard coded to all pages. The form is set to POST (which is odd because this is semantically a GET request) however the backend code that CoverLeaf uses is able to use either request form interchangeably, so I was able to construct a GET request like:


```
http://www.make-digital.com/make/vol23/Download_submit.action?pgs=all&lm=1280161230000
```

All well and great, but when I deleted my cookies for make-digital.com using the Web Inspector, the URL returned a login page rather than my issue of MAKE. Yes! Finally, CoverLeaf has some sort of security on the download. But wait, the form in question is just asking for email, in fact, if you look at the code:

```html
<form method="post">
  <input type="text" name="email" value="Email" onclick="javascript:this.focus();this.select();">
  <input type="submit" value="LOG IN">
  <p/>
  <p></p>
  <p>If you have any questions, please contact<a id="button_digital_support" title="digital support" href="/make/vol23/DigitalSupport_input.action?lm=1280161230000"><span>digital support</span></a></p>
  </div>
</form>
```

You will notice another POST form, but this time with no action URL. What that tells the browser is that when the form is completed it should be sent back to the current URL. The current URL is the address of the PDF and I was able to change the POST to a GET again and add the email=user@domain.com to the end of my URL for:

```
http://www.make-digital.com/make/vol23/Download_submit.action?pgs=all&lm=1280161230000&email=user@domain.com
```

With a valid email address this URL just returns a cookie with your login credentials and a 302 redirect back to the original page. The download page is just a simple HTML page with a JavaScript onload handler that initiates the download.

Simple enough to turn into an RSS feed for iTunes so I can read on my iPad. I chose to write it in PHP as my web host supports that language, but it could have been done in almost any language. The steps to do so are pretty straightforward:

1. Create a PHP version of the RSS feed that just takes a URL like make.php?email=user@domain.com and returns an RSS feed with links that contain the email address.

1. Create a proxy script that takes the email address, magazine, and issue information and scrapes CoverLeaf’s pages to return a 302 redirect to the actual URL where the PDF can be found.

1. Use mod_rewrite to make the URL pretty so iTunes does not complain.

Step 2 is where all the magic happens:

```php
    <?php

    /* STEP 0. Grab the parameters from the query string */
        $magazine = $_GET['magazine'];
        $issue = $_GET['issue'];
        $email = $_GET['email'];

    /* STEP 1. create a cookie file to store the session cookies for this request */
        $cookie_file = tempnam ("/tmp", "coverleaf-cookie-");

    /* STEP 2. login to CoverLeaf using CURL (Copy URL) with email to set the cookie properly */
        $ch = curl_init ("http://www.$magazine-digital.com/$magazine/$issue/Download_submit.action?pgs=all&lm=1273130943000&email=$email");

        // Tells curl to store any cookies in the file
        curl_setopt ($ch, CURLOPT_COOKIEJAR, $cookie_file);

        // Return rather than output the results of the curl request
        curl_setopt ($ch, CURLOPT_RETURNTRANSFER, true);

        // Use the user's HTTP User Agent so CoverLeaf can keep track of things properly
        curl_setopt($ch, CURLOPT_USERAGENT, $_SERVER['HTTP_USER_AGENT']);

        // Do the request
        $output = curl_exec($ch);

    /* STEP 3. get URL to download issue from */
        $ch = curl_init ("http://www.$magazine-digital.com/$magazine/$issue/Download_submit.action?pgs=all&lm=1273130943000");

        // Use the cookie file from the previous request
        curl_setopt ($ch, CURLOPT_COOKIEFILE, $cookie_file);

        // Return rather than output the results of the curl request
        curl_setopt ($ch, CURLOPT_RETURNTRANSFER, true);

        // Use the user's HTTP User Agent so CoverLeaf can keep track of things properly
        curl_setopt($ch, CURLOPT_USERAGENT, $_SERVER['HTTP_USER_AGENT']);

        // Output of request is important
        $output = curl_exec ($ch);

        /* Find anchor tag in returned HTML by parsing the Document Object Model returned */
        $dom = new domDocument;
        $dom->loadHTML($output);
        $pdfURL = $dom->getElementsByTagName('a')->item(0)->getAttribute('href');

    /* STEP 4. Tell the User Agent to redirect to the URL that was found */
        header("Location: http://www.$magazine-digital.com$pdfURL");
        exit;
    ?>
```

Then a few simple mod_rewrite rules to keep iTunes happy:

```
# RSS Feeds normally end with .rss, some readers expect this, so put email address in URL
RewriteRule feeds/(.*)/make.rss /path/to/cgi-bin/make.php?email=$1

# iTunes requires that content types match the file extension, so put parameters in URL
RewriteRule download/(.*)/(.*)/(.*)\.pdf /path/to/cgi-bin/download_magazine.php?email=$1&magazine=$2&issue=$3
```

In testing, I noticed that the download links don’t always work from either make-digital.com or my RSS feed. Clicking download a few times seems to get around this. I think CoverLeaf has a race condition with their timestamp URL generator that ends up giving you invalid URLs.
