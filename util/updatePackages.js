import {readFileSync} from 'fs';
import {basename} from 'path';
import dox from 'dox';
import getPkgRepo from 'get-pkg-repo';
import remark from 'remark';
import remarkHeadingGap from 'remark-heading-gap';
import remarkLicense from 'remark-license';
import remarkToc from 'remark-toc';
import stringifyObject from 'stringify-object';
import writeFile from 'write-file';
import u from 'unist-builder';
import pluginName from './pluginName';
import getPackages from './getPackages';
import getPresets from './getPresets';
import contributorsSection from './contributorsSection';
import installSection from './installSection';

const repository = `ben-eb/cssnano`;
const homepage = `https://github.com/${repository}`;

function writeError (err) {
    if (err) {
        throw err;
    }
}

function semverMajor (dependencies) {
    Object.keys(dependencies).forEach(dependency => {
        let version = dependencies[dependency];
        if (version[0] === '^' && version[1] !== '0') {
            version = version.split('.')[0] + '.0.0';
        }
        dependencies[dependency] = version;
    });

    return dependencies;
}

function sortPlugins (a, b) {
    const ba = pluginName(a[0]);
    const bb = pluginName(b[0]);
    if (ba < bb) {
        return -1;
    }
    if (ba > bb) {
        return 1;
    }
    return 0;
}

function updatePreset (packageList, pkg) {
    const managed = packageList.map(p => basename(p));
    const pkgName = basename(pkg);
    const pkgJson = require(`${pkg}/package.json`);
    const plugins = [];

    const preset = require(pkg);
    const instance = preset();

    const code = readFileSync(`${pkg}/src/index.js`, `utf8`);
    const {tags} = dox.parseComments(code)[0];

    let overview = [];

    if (tags.length) {
        const overviewDesc = tags.find(tag => tag.type === 'overview');
        if (overviewDesc) {
            overview.push(
                u('heading', {depth: 2}, [u('text', 'Overview')]),
                ...remark().parse(overviewDesc.string).children,
            );
        }
    }

    instance.plugins.sort(sortPlugins).forEach(([plugin, options]) => {
        const name = pluginName(plugin);
        let pluginDesc, pluginRepo, externalLink;
        try {
            let pluginPkg;
            try {
                pluginPkg = require(`${pkg}/node_modules/${name}/package.json`);
            } catch (e) {
                // Most likely it's a nested dependency from the default preset.
                pluginPkg = require(`${pkg}/node_modules/cssnano-preset-default/node_modules/${name}/package.json`);
            }
            pluginDesc = pluginPkg.description;
            if (~managed.indexOf(name)) {
                pluginRepo = `${homepage}/tree/master/packages/${name}`;
            } else {
                externalLink = true;
                const r = getPkgRepo(pluginPkg);
                pluginRepo = `${r.default}://${r.domain}/${r.user}/${r.project}`;
            }
        } catch (e) {
            // Make an exception for core processors that don't
            // have their own repository.
        }
        const documentation = [];
        if (pluginDesc) {
            documentation.push(
                u('heading', {depth: 3}, [
                    u('link', {url: pluginRepo}, [u('inlineCode', name)]),
                    externalLink && u('text', ' (external)'),
                ].filter(Boolean)),
                u('blockquote', [
                    u('text', pluginDesc),
                ])
            );
        } else {
            documentation.push(
                u('heading', {depth: 3}, [
                    u('inlineCode', name),
                ])
            );
        }
        if (!options) {
            documentation.push(
                u('paragraph', [
                    u('text', 'This plugin is loaded with its default configuration.'),
                ])
            );
        } else {
            documentation.push(
                u('paragraph', [
                    u('text', 'This plugin is loaded with the following configuration:'),
                ]),
                u('code', {lang: 'js'}, stringifyObject(options))
            );
        }
        plugins.push.apply(plugins, documentation);
    });

    let transformedAST = remark()
        .use(contributorsSection)
        .use(installSection)
        .use(remarkLicense)
        .use(remarkToc)
        .runSync(u('root', [
            u('heading', {depth: 1}, [u('text', pkgName)]),
            u('blockquote', [
                u('text', pkgJson.description),
            ]),
            u('heading', {depth: 2}, [u('text', 'Table of Contents')]),
            ...overview,
            u('heading', {depth: 2}, [u('text', 'Usage')]),
            u('heading', {depth: 2}, [u('text', 'Plugins')]),
            ...plugins,
            u('heading', {depth: 2}, [u('text', 'Contributors')]),
            u('heading', {depth: 2}, [u('text', 'License')]),
        ]), {cwd: pkg});

    writeFile(
        `${pkg}/README.md`,
        remark().use(remarkHeadingGap).stringify(transformedAST) + '\n',
        writeError
    );
}

function updatePackage (pkg) {
    const pkgName = basename(pkg);
    const pkgJson = require(`${pkg}/package.json`);

    pkgJson.name = pkgName;
    pkgJson.repository = repository;
    pkgJson.homepage = homepage;

    pkgJson.bugs = pkgJson.bugs || {};
    pkgJson.bugs.url = `${homepage}/issues`;

    pkgJson.engines = pkgJson.engines || {};
    pkgJson.engines.node = ">=4";

    if (pkgJson.dependencies) {
        pkgJson.dependencies = semverMajor(pkgJson.dependencies);
    }

    if (pkgJson.devDependencies) {
        pkgJson.devDependencies = semverMajor(pkgJson.devDependencies);
    }

    writeFile(
        `${pkg}/package.json`,
        `${JSON.stringify(pkgJson, null, 2)}\n`,
        writeError
    );
}

getPackages().then(packages => {
    packages.forEach(updatePackage);
    getPresets(packages).forEach(updatePreset.bind(null, packages));
});
