# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.3] - 2022/09/17
### Changed
- Replace `dxt-js` dependency with `silent-dxt-js`.

## [0.2.2] - 2022/07/29
### Changed
- Minimum image width and height are back to 4 pixels.
- Retain original image dimensions when converting from PNG.
### Fixed
- Fix issue with converting images that are not a power of 2.

## [0.2.1] - 2022/07/20
### Added
- Add `DdsConversionOptions` to make mipmaps and shuffling configurable.
### Changed
- Minimum image width and height are now 8 pixels.
### Fixed
- Add `Bitmap` interface to documentation index.

## [0.2.0] - 2022/06/21
### Changed
- Add options to DdsImage's `toShuffled()` and `toUnshuffled()`.
- Remove support for all external image formats other than PNG.

## [0.1.0] - 2022/06/09
### Added
- First release.
