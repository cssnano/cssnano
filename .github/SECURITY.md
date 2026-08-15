# Security Policy

## Supported Versions

Only the latest major version of `cssnano` and its sub-packages receives
security fixes. We do not backport fixes to older major versions.

## Reporting a Vulnerability

If you believe you have found a security vulnerability in cssnano or any
package in this monorepo, please report it privately using
[GitHub Security Advisories](https://github.com/cssnano/cssnano/security/advisories/new)
rather than filing a public issue.

Please include:

- A description of the vulnerability and its potential impact.
- Steps to reproduce, ideally a minimal CSS/config input that triggers it.
- The affected package(s) and version(s).

We aim to acknowledge reports within seven days and keep you updated as we
investigate and prepare a fix. Once a fix is released, we will publish a
GitHub Security Advisory where appropriate.

## Scope and Threat Model

cssnano is a build-time CSS optimizer, intended to run over CSS authored or
reviewed by the developer using it, typically as part of a bundler or
PostCSS pipeline. It is **not** designed to safely process CSS (or embedded
content such as SVG data URIs) supplied directly by untrusted end users at
runtime. If your application passes user-controlled input through cssnano,
treat that as an untrusted-input scenario and apply your own
sanitization/validation before processing. Before using cssnano's output in a
security-sensitive context, validate or sanitize the final emitted values too.

Within that model, we consider the following in scope for security reports:

- Crashes, hangs, or excessive resource consumption (e.g. ReDoS) triggered
  by processing malformed or adversarial CSS input.
- Output that is unsafe in ways a reasonable user would not expect from an
  optimizer (e.g. cssnano introducing executable content that wasn't
  present in equivalent form in the input).
- Supply-chain issues in this repository's own code. Report issues in
  third-party dependencies upstream, and also report them privately here when
  they affect cssnano's published packages or supported configuration.

## Disclosure Policy

We ask that you give us a reasonable amount of time to investigate and fix
a reported issue before any public disclosure, and that you make a good
faith effort to avoid privacy violations, data destruction, and service
interruption during your research.
