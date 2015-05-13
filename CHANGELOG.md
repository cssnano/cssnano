# 1.1.0

* Now can merge identifiers such as `@keyframes` and `@counter-style` if they
  have duplicated properties but are named differently.
* Fixes an issue where duplicated keyframes with the same name would cause
  an infinite loop.

# 1.0.2

* Improve module loading logic (thanks to @tunnckoCore).
* Improve minification of numeric values, with better support for `rem`,
  trailing zeroes and slash/comma separated values
  (thanks to @TrySound & @tunnckoCore).
* Fixed an issue where `-webkit-tap-highlight-color` values were being
  incorrectly transformed to `transparent`. This is not supported in Safari.
* Added support for viewport units (thanks to @TrySound).
* Add MIT license file.

# 1.0.1

* Add repository/author links to package.json.

# 1.0.0

* Initial release.
