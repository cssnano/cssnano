import webpack from 'webpack';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  mode: 'production',
  context: path.resolve(__dirname),
  cache: {
    type: 'filesystem',
  },
  entry: {
    playground: './src/playground.js',
  },
  output: {
    path: path.resolve(__dirname, '_site/js'),
    filename: '[name].bundle.js',
    clean: true,
  },
  optimization: {
    runtimeChunk: 'single',
    chunkIds: 'deterministic',
    splitChunks: {
      chunks: 'all',
      maxSize: 244 * 1024,
      cacheGroups: {
        svgo: {
          test: /[\\/]node_modules[\\/]svgo[\\/]/,
          idHint: 'svgo',
          priority: 20,
        },
        codemirror: {
          test: /[\\/]node_modules[\\/]@codemirror[\\/]/,
          name: 'codemirror',
          priority: 10,
        },
      },
    },
  },
  performance: {
    maxEntrypointSize: 350 * 1024,
    maxAssetSize: 350 * 1024,
  },
  resolve: {
    /* Unfortunately the SVGO browser build does not resolve otherwise */
    alias: {
      svgo: path.resolve(__dirname, './node_modules/svgo/dist/svgo.browser.js'),
    },
  },
  plugins: [
    new webpack.EnvironmentPlugin({ BROWSERSLIST_DISABLE_CACHE: true }),
  ],
  experiments: {
    outputModule: true,
    futureDefaults: true,
  },
};
