# Minimal repro: changing only `filename` renames the shared wrapper chunks

`@module-federation/vite` puts a scope key into the names of the loadShare / prebuild chunks, into
the runtime remote aliases and into the runtime init key. Since
[module-federation/vite#1167](https://github.com/module-federation/vite/pull/1167) the key is a
hash of the whole normalized federation options, and that includes `filename`.

A per-build entry name such as `remoteEntry.<git sha>.js` is a common way to stop a long-caching
CDN from serving a stale entry. With it, every build gets a new key. The shared wrapper chunks are
renamed on every build, and so is every chunk that imports one, even when no source changed.

Verified on `@module-federation/vite` 1.23.6, vite 8.3.5, node 24.22.1, macOS.

## Run

```sh
npm install
npm run repro
```

`repro.mjs` runs `vite build` four times, each in a fresh process:

- two builds that differ only in `filename` (`remoteEntry.aaaaaaaa.js` and `remoteEntry.bbbbbbbb.js`);
- a control pair with the same `filename`.

For each pair it prints the scope key found in the output and the files of the first build that
are missing from the second.

## Result

| Builds | Scope key | Files renamed |
| --- | --- | --- |
| only `filename` differs | `235312469092189` vs `2983668174327` | **8 of 13** |
| control, same `filename` | `235312469092189` both times | 0 of 13 |

```
only filename differs: remoteEntry.aaaaaaaa.js vs remoteEntry.bbbbbbbb.js
scope key: 235312469092189 vs 2983668174327
renamed: 8 of 13
  assets/_virtual_mf-localSharedImportMap___mfe_internal__host__mf_owner__1-CfS-321y.js
  assets/_virtual_mf___mfe_internal__host__loadRemote__remote_mf_1_widget__mf_owner__1__loadRemote__-C5JADxcj.js
  assets/_virtual_mf___mfe_internal__host__mf_owner__235312469092189__loadShare__react__loadShare__.js-BYdgDBAO.js
  assets/hostInit-C5PELvuF.js
  assets/index-DLYsU37O.js
  assets/mf-entry-bootstrap-0-d0f5cdb1.js
  assets/pendingShares-Z7Mt-CJo.js
  remoteEntry.aaaaaaaa.js
```

Some renames follow from the entry name and are expected: the entry itself, `hostInit`, which
imports the entry by name, and the chunks that import `hostInit` (`index`, `mf-entry-bootstrap-0`
and the `loadRemote` chunk). The react loadShare wrapper, `localSharedImportMap` and
`pendingShares` should keep their names.

## Layout

| Path | What it is |
| --- | --- |
| `vite.config.mjs` | a host with one shared dependency (`react`) and one remote; `filename` comes from `ENTRY` |
| `src/main.js` | imports `react` and the remote |
| `repro.mjs` | builds four times in fresh processes and compares the output file names |

## Why

`getFederationScopeKey` in `src/virtualModules/virtualModuleScope.ts` hashes
`JSON.stringify(stableConfigValue(options))`, and `stableConfigValue` drops only `implementation`.
Before module-federation/vite#1167 the owner segment was a per-process counter, so changing only
`filename` renamed nothing.

## Fix

Proposed upstream in https://github.com/module-federation/vite/pull/1509: hash the options without
`filename`, and use `filename` only when it is the one difference between two instances in the
same process.

With that branch (`pnpm build && pnpm pack`) installed in place of 1.23.6:

| Builds | Scope key | Files renamed |
| --- | --- | --- |
| only `filename` differs | `104004152475523` both times | 5 of 13 |
| control, same `filename` | `104004152475523` both times | 0 of 13 |

The five are the expected ones: `remoteEntry.aaaaaaaa.js`, `hostInit`, `index`,
`mf-entry-bootstrap-0` and the `loadRemote` chunk.
