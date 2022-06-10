# Sims 4 Toolkit - Images (@s4tk/images)

## Overview

This project contains models and algorithms required for processing images that appear in various image resources.

Major credit goes towards the creators of [S4PI](https://github.com/s4ptacle/Sims4Tools), specifically those who contributed to the [DstResource](https://github.com/s4ptacle/Sims4Tools/blob/develop/s4pi%20Wrappers/ImageResource/DSTResource.cs). Without this implementation, I wouldn't have been able to figure out shuffling/unshuffling for the DST compression algorithm.

## ⚠️ Experimental ⚠️

While all S4TK software is in pre-release, this package is especially experimental. I cannot guarantee that conversions between image formats is going to go smoothly. For best results, use PNG for both importing and exporting DDS images. JPG/BMP do not support transparency, and GIF/TIFF may appear discolored when exported.

## Installation

Install the package as a dependency from npm with the following command:

```sh
npm i @s4tk/images
```

## Disclaimers

Sims 4 Toolkit (S4TK) is a collection of creator-made modding tools for [The Sims 4](https://www.ea.com/games/the-sims). "The Sims" is a registered trademark of [Electronic Arts, Inc](https://www.ea.com/). (EA). Sims 4 Toolkit is not affiliated with or endorsed by EA.

All S4TK software is currently considered to be in its pre-release stage. Use at your own risk, knowing that breaking changes are likely to happen.

## Documentation

Visit [sims4toolkit.com/#/docs/images](https://sims4toolkit.com/#/docs/images) for the most up-to-date documentation.
