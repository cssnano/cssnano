const fs = require('fs');
const path = require('path');
const remark = require('remark');
const behead = require('remark-behead');
const github = require('remark-github');

const tmpl = `---
title: Changelog
layout: BasicPage
---\n\n`;

const proc = remark()
    .use(behead, {weight: -1})
    .use(github, {repository: 'ben-eb/cssnano'});

const changes = proc.process(fs.readFileSync(path.join(__dirname, '..', '..', 'CHANGELOG.md'), 'utf-8'));

fs.writeFile(path.join(__dirname, '../content/changelog.md'), tmpl + changes, (err) => {
    if (err) {
        throw err;
    }
});
