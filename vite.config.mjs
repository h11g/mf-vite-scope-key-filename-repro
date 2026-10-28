import { federation } from '@module-federation/vite';

export default {
  build: { target: 'esnext' },
  plugins: [
    federation({
      name: 'host',
      // per-build entry name, e.g. remoteEntry.<git sha>.js
      filename: process.env.ENTRY,
      remotes: {
        remote: { type: 'module', name: 'remote', entry: 'http://localhost:4174/remoteEntry.js' },
      },
      shared: { react: { singleton: true } },
      dts: false,
    }),
  ],
};
