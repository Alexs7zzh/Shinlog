`pnpm fonts` regenerates the site fonts from the upstream sources in `fonts/source`.

Structure:

- `fonts/source`: upstream font binaries committed to the repo
- `fonts/generated`: generated charset snapshots used by the subsetter
- `fonts/licenses`: upstream license files
- `fonts/.venv`: local Python toolchain bootstrapped on demand for `pyftsubset`

The generated webfonts are written to `public/fonts`.
