import path from 'node:path';

/**
 * Self-hosted font files. Bun's CSS bundler inlines every url() as base64, so
 * the @font-face rules live inline in index.html and point at /fonts/*, which
 * the dev server routes here and build.ts copies into dist/fonts.
 */
const FONTS: Record<string, string> = {};
for (const pkg of ['inter', 'source-serif-4', 'jetbrains-mono']) {
  for (const subset of ['latin', 'latin-ext']) {
    const file = `${pkg}-${subset}-wght-normal.woff2`;
    FONTS[file] = path.join(
      import.meta.dir,
      '..',
      'node_modules',
      '@fontsource-variable',
      pkg,
      'files',
      file,
    );
  }
}

export default FONTS;
