# 2.1.2

* Removed an unnecessary `trim` method that was used to work around a now
  resolved issue in PostCSS (thanks to @TrySound).

# 2.1.1

* Fixed a regression that was compressing space around forward slashes in
  calc functions.

# 2.1.0

* Better support for minifying colors in legacy CSS gradients, switched to
  postcss-value-parser (thanks to @TrySound).

# 2.0.0

* Upgraded to PostCSS 5.

# 1.2.7

* Fixes an issue where IE filter properties were being converted
  erroneously (thanks to @faddee).

# 1.2.6

* Fixed a crash when specifying `inherit` as a value
  to `-webkit-tap-highlight-color`.

# 1.2.5

* Speed up node iteration by calling `eachDecl` once rather than twice.

# 1.2.4

* Fixed an issue caused by upgrading colormin to use ES6.

# 1.2.3

* Fixed an issue where `-webkit-tap-highlight-color` was being incorrectly
  transformed to `transparent`. This is not supported in Safari.

# 1.2.2

* Fixed a bug where the module crashed on parsing comma separated values for
  properties such as `box-shadow`.

# 1.2.1

* Extracted each color logic into a function for better readability.

# 1.2.0

* Now uses the PostCSS `4.1` plugin API.

# 1.1.0

* Now supports optimisation of colors in gradient values.

# 1.0.0

* Initial release.
