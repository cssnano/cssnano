const fs = require('fs');
const path = require('path');
const toml = require('toml');
const camel = require('camelcase');

const metadata = toml.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'metadata.toml'), 'utf-8'));

metadata.modules.forEach(module => {
    module.shortName = camel(module.name.replace('postcss', ''));
});

metadata.modules.forEach(module => {
    const shortName = module.shortName;
    const title = module.safe === false ? `${shortName} (unsafe)` : shortName;
    const content = `---
title: "${title}"
layout: Optimisation
identifier: ${shortName}
---

${module.longDescription}
`;

    fs.writeFile(path.join(__dirname, `../content/optimisations/${shortName}.md`), content, err => {
        if (err) {
            throw err;
        }
    });
});
