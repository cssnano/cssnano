---
title: New beginnings
date: 2016-05-10
layout: Post
---

It's been a while since the first commit of the website was pushed to GitHub, on
the 26th of June 2015. Since that website launched, cssnano has grown bigger and
better, and what was once a small site has ballooned from something easily
accessible to something that was in need of a rework. So, as you can probably
tell from this post, we decided to do just that.

We've added a new header with navigation links to the most important areas of
the site; each page now has section headings with GitHub style anchor links, so
that they can be easily linked to from other sites; and finally the
documentation has been brought up to date to cover the most recent release.
Going forward, this site will be easier to update as a lot of the pages are
generated dynamically.

The site itself now uses [Phenomic](https://phenomic.io/), a really great static
site generator that uses React components; CSS syntax highlighting is
provided by [Midas](http://midasjs.com), which is powered by PostCSS; and, we
have also moved the location of the docs directly into the cssnano repository.
This was done so that common elements that both the documentation and the main
repository share are now in the same location. This allows us to do things like
putting the [changelog](/changelog) on the site!

If your company uses cssnano and would like to be added to the list of users
displayed on the site, then [please send us a pull request](https://github.com/ben-eb/cssnano/pulls) with your
(preferably SVG) logo in 500x200 format in the [`assets`](https://github.com/ben-eb/cssnano/tree/master/site/content/assets)
directory, and add your details to [`users.json`](https://github.com/ben-eb/cssnano/tree/master/site/users.json).

Thanks for reading.
