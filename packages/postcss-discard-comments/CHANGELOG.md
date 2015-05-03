# 1.1.2

* Fixes an issue where comment separated values were being incorrectly
  transformed to not have spaces separating them instead, in `decl.value`.
  e.g. `10px/*test*/20px` became `10px20px` in `decl.value` but not
  `decl._value.raw`.

# 1.1.1

* Fixes a bug where non-special comments, with an exclamation mark in any part
  of the text, were not being removed.

# 1.1.0

* Now uses the PostCSS `4.1` plugin API.
* Adds support for transforming comments inside `!important` values.

# 1.0.2

* Adds a JSHint config, tidy up unnecessary lines of code.

# 1.0.1

* Fixed a bug which affected initializing the plugin with no options.
* Stopped the plugin from trying to match comments in empty strings.

# 1.0.0

* Initial release.
