# 1.1.1

* Fixes an issue where trailing zeroes were not being removed in
  values that were not `0`.

# 1.1.0

* Adds support for removing leading zeroes from `rem` values.

# 1.0.3

* Fixed a bug where filenames were being incorrectly transformed.

# 1.0.2

* Fixed a bug where `1.` and `.0` were not being optimised to `1` and `0`,
  respectively.

# 1.0.1

* Fixed a bug where `undefined` would be stringified as the unit value, if the
  value did not have a unit.

# 1.0.0

* Initial release.
