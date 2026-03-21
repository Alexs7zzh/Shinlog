# Font Audit

This document is a manual audit snapshot to compare three different points in time:

1. Old repo shipped webfonts from `/Users/alex/dev/Shinlog_old/assets`
2. Earlier source files used on this branch before the recent replacement
3. Current source files copied from `/Users/alex/Downloads`

It exists to clarify what changed before making any final decisions about font features or weights.

Current baseline decision for this branch:

- EB Garamond source baseline is now the static set from `/Users/alex/Downloads/EB_Garamond/static`
- The current source now includes regular, italic, and semibold
- Regular and italic now match the earlier branch source feature-for-feature
- The EB feature keep-list is still provisional and should be reviewed separately

## Terminology

- "Old repo" means `/Users/alex/dev/Shinlog_old`
- "Earlier source on this branch" means the files committed in `f28bb78` before the recent replacement
- "Current source" means the files now in `fonts/source`

## Important Clarification

When I previously said "old source was the earlier variable font", I meant:

- the earlier source files in this branch were:
  - `fonts/source/eb-garamond/EBGaramond[wght].ttf`
  - `fonts/source/eb-garamond/EBGaramond-Italic[wght].ttf`

I did **not** mean that `Shinlog_old` had a variable-font source checked into the repo.

The old repo only shows the **shipped webfonts**, not the original upstream EB Garamond source files used to make them.

## Semibold Check

The old repo definitely shipped a real semibold EB Garamond webfont:

- `/Users/alex/dev/Shinlog_old/assets/eb-garamond/ebGaramondSemibold-a9735e5b.woff2`
- Family: `EB Garamond SemiBold`
- Weight class: `600`
- Features: `dlig`, `kern`, `liga`, `locl`, `onum`, `smcp`, `swsh`

So semibold was present in the old site output.

What is not currently recoverable from the old repo is the original upstream source file that produced it.
The old repo does not contain a matching original `.ttf`/`.otf` source for that semibold webfont.

## iA Writer Duo

### Old branch source vs current source

The old branch source files and the current source files are byte-identical:

- old: `/tmp/shinlog-old-font-sources/ia-duo/iAWriterDuoS-Regular.ttf`
- new: `fonts/source/ia-duo/iAWriterDuo-Regular.ttf`
- old: `/tmp/shinlog-old-font-sources/ia-duo/iAWriterDuoS-Italic.ttf`
- new: `fonts/source/ia-duo/iAWriterDuo-Italic.ttf`

SHA-256:

- Regular: `454a20d2b4569ba66810f0f710bb022065cbaac11c82fdcef677545ab27329f2`
- Italic: `8e15abab476026abd362d079fd519e9c1220e0ab32b3ce3e4c13695af53e7153`

### Features

Source font features for both old and current iA Writer Duo:

- `aalt`
- `ccmp`
- `dnom`
- `frac`
- `mark`
- `numr`
- `ordn`
- `salt`
- `sinf`
- `ss01`
- `ss02`
- `ss03`
- `ss04`
- `ss05`
- `sups`
- `zero`

### Old shipped webfont

Old repo shipped iA webfonts expose a smaller retained set:

- `dnom`
- `numr`
- `sups`
- `zero`

This means the old shipped webfont was already a reduced delivery artifact, not a good source of truth for upstream font capabilities.

## EB Garamond

## Old repo shipped webfonts

Old repo shipped these EB webfonts:

- `ebGaramond-28fcef18.woff2`
  - Family: `EB Garamond 12`
  - Weight: `400`
  - Features: `calt`, `cv02`, `cv82`, `cv90`, `dlig`, `kern`, `liga`, `locl`, `mark`, `onum`, `smcp`, `sups`, `tnum`
- `ebGaramondItalic-02c49222.woff2`
  - Family: `EB Garamond 12`
  - Weight: `400`
  - Features: `calt`, `cv02`, `cv82`, `dlig`, `kern`, `liga`, `locl`, `mark`, `onum`, `smcp`, `sups`
- `ebGaramondSemibold-a9735e5b.woff2`
  - Family: `EB Garamond SemiBold`
  - Weight: `600`
  - Features: `dlig`, `kern`, `liga`, `locl`, `onum`, `smcp`, `swsh`

This is the strongest evidence for historical runtime behavior.

## Earlier source on this branch

Earlier source files on this branch were:

- `/tmp/shinlog-old-font-sources/eb-garamond/EBGaramond-wght.ttf`
- `/tmp/shinlog-old-font-sources/eb-garamond/EBGaramond-Italic-wght.ttf`

These were variable-font files with axis:

- `wght`

Earlier branch source features:

### Earlier source regular

- `aalt`
- `c2pc`
- `c2sc`
- `case`
- `dlig`
- `frac`
- `hist`
- `hlig`
- `kern`
- `liga`
- `lnum`
- `locl`
- `mark`
- `onum`
- `ordn`
- `pcap`
- `pnum`
- `sinf`
- `smcp`
- `ss01`
- `ss02`
- `ss03`
- `ss04`
- `ss05`
- `ss06`
- `ss07`
- `subs`
- `sups`
- `swsh`
- `tnum`

### Earlier source italic

- `aalt`
- `c2pc`
- `c2sc`
- `case`
- `dlig`
- `fina`
- `frac`
- `hist`
- `hlig`
- `init`
- `kern`
- `liga`
- `lnum`
- `locl`
- `mark`
- `mkmk`
- `onum`
- `ordn`
- `pcap`
- `pnum`
- `sinf`
- `smcp`
- `ss01`
- `ss02`
- `ss03`
- `ss04`
- `ss05`
- `ss06`
- `ss07`
- `subs`
- `sups`
- `swsh`
- `tnum`

## Current source from Downloads

Current source files are:

- `fonts/source/eb-garamond/EBGaramond-Regular.ttf`
- `fonts/source/eb-garamond/EBGaramond-Italic.ttf`
- `fonts/source/eb-garamond/EBGaramond-SemiBold.ttf`

These are static `EB Garamond` cuts from `/Users/alex/Downloads/EB_Garamond/static`, not variable fonts.

SHA-256:

- Regular: `a45a5040e1a328d056871d42aa70f10f7ca3bf5c447887b80720542feeead5f2`
- Italic: `2fd1d4b2b36ea7fc3a7a7c93f9cdc51cdee5ba26b1bbff8d45c16d8f6a87e224`
- SemiBold: `d43b3fb8b241aea0ce82c6d4cfc4cd49d04e7de0e84742eb71a9ab0399b4a6a7`

Source metadata:

- Regular: family `EB Garamond`, subfamily `Regular`, weight `400`
- Italic: family `EB Garamond`, subfamily `Italic`, weight `400`
- SemiBold: family `EB Garamond SemiBold`, subfamily `Regular`, weight `600`

### Current source regular

Current source regular matches the earlier branch source regular feature-for-feature.

Shared feature count vs earlier branch source: `30`

### Current source italic

Current source italic matches the earlier branch source italic feature-for-feature.

Shared feature count vs earlier branch source: `33`

### Current source semibold

Current source semibold features:

- `aalt`
- `c2pc`
- `c2sc`
- `case`
- `dlig`
- `frac`
- `hist`
- `hlig`
- `kern`
- `liga`
- `lnum`
- `locl`
- `mark`
- `onum`
- `ordn`
- `pcap`
- `pnum`
- `sinf`
- `smcp`
- `ss01`
- `ss02`
- `ss03`
- `ss04`
- `ss05`
- `ss06`
- `ss07`
- `subs`
- `sups`
- `swsh`
- `tnum`

## EB Feature Differences

### Earlier branch source vs current source regular

Only in earlier branch source:

- (none)

Only in current source:

- (none)

Shared feature count: `30`

### Earlier branch source vs current source italic

Only in earlier branch source:

- (none)

Only in current source:

- (none)

Shared feature count: `33`

### Old shipped semibold webfont vs current semibold source

Only in old shipped webfont:

- (none)

Only in current semibold source:

- `aalt`
- `c2pc`
- `c2sc`
- `case`
- `frac`
- `hist`
- `hlig`
- `lnum`
- `mark`
- `ordn`
- `pcap`
- `pnum`
- `sinf`
- `ss01`
- `ss02`
- `ss03`
- `ss04`
- `ss05`
- `ss06`
- `ss07`
- `subs`
- `sups`
- `tnum`

Shared feature count: `7`

## Current Script Status

The current branch has in-progress script changes and generated outputs, but this document is intended as the review checkpoint before making any final decisions.

The safest conclusions from the audit are:

- iA Writer Duo does not need further feature investigation; the source did not actually change
- EB Garamond regular and italic now match the earlier branch source exactly in feature inventory
- The old repo did have a real semibold asset at runtime
- The current branch now has a real semibold source again
- The current generated regular/italic reports show requested-but-missing features, which means the current EB feature spec should be reviewed before freezing the pipeline

## Decisions Still Open

These should be reviewed before freezing the final pipeline:

1. Should the regular/italic EB feature keep-list be changed to match the new static source set, given that the current spec now requests missing features like `ccmp`, `calt`, and `cv02`?
2. Should the semibold generated output keep the current old-runtime-like subset (`kern`, `liga`, `onum`, `dlig`, `locl`, `smcp`, `swsh`) or preserve a broader set from the source?
