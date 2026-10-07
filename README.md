<!--
SPDX-FileCopyrightText: 2026 Tim Lochmüller <tim@usemjml.com>

SPDX-License-Identifier: MIT
-->

# n8n-nodes-usemjml

An [n8n](https://n8n.io) community node for [usemjml.com](https://usemjml.com) — render
[MJML](https://mjml.io) to responsive email HTML without a Node toolchain or MJML upgrade in
your own stack, and validate templates before you send them.

This package ships **two nodes** and **one credential**:

| Node | Purpose |
|------|---------|
| **MJML Render** | Turns MJML into email HTML (`POST /api/render`) |
| **MJML Validate** | Checks an MJML template and returns its validation errors (`POST /api/validate`) |

## Installation

In n8n: **Settings → Community Nodes → Install** and enter `n8n-nodes-usemjml`.

Self-hosted / manual:

```bash
npm install n8n-nodes-usemjml
```

## Credential — UseMJML API

The credential is **optional** for both nodes. Without it, requests run on the anonymous
limit (100 requests per hour, shared by all anonymous callers). With a free API key you get
your own budget of 150 requests per hour. Get a key at <https://usemjml.com/#api-key>.

| Field | Description |
|-------|-------------|
| **API Key** | Your key (`mjml_…`). Sent as `X-API-Key` header. |
| **Base URL** | Defaults to `https://usemjml.com`. Change it only if you run the open-source usemjml server yourself. |

The **Test** button calls `POST /api/me`, which answers `200` for a valid, activated key and
`401` otherwise. It does not count against your rate limit.

## Nodes

### MJML Render

Input: the **MJML** template (max. 2 MiB, `mj-include` is not supported).

Options (all map 1:1 to the usemjml `config` object):

| Option | Values | Default | Effect |
|--------|--------|---------|--------|
| **Validation Level** | `skip`, `soft`, `strict` | `soft` | `strict` makes the node fail on an invalid template |
| **Minify** | boolean | `false` | Minify the generated HTML |
| **Beautify** | boolean | `false` | Pretty-print the generated HTML |
| **Keep Comments** | boolean | `true` | Keep HTML comments |
| **Fonts** | list of name → `https://` URL | MJML defaults | Web fonts the template may reference |

Output:

```json
{ "html": "<!doctype html>…", "errors": [], "mjml": "5.4.1" }
```

`errors` holds the soft validation errors MJML reported while rendering. `mjml` is the MJML
version that rendered the template.

### MJML Validate

Input: the **MJML** template. Option: **Validation Level** (`skip`, `soft`, `strict`).

An invalid template is **not** a node error. The node returns `valid: false` together with the
errors, so you can branch on `valid` with an **If** node:

```json
{
  "valid": false,
  "errors": [
    { "line": 1, "message": "mj-text cannot be used inside mj-body", "tagName": "mj-text" }
  ],
  "validationLevel": "strict",
  "mjml": "5.4.1"
}
```

## Localization

The node UI ships a **German (`de`)** translation in addition to the English default.
n8n shows it when the instance locale is set:

```bash
export N8N_DEFAULT_LOCALE=de
```

Translation files live in [nodes/UseMjml/translations/](nodes/UseMjml/translations) and are
copied into `dist/` by the build.

## Local testing with Docker

```bash
npm install && npm run build      # produces ./dist
docker compose up                 # http://localhost:5678
```

Login: `test@example.com` / `TestNode123`. Keep `npm run build:watch` running in a second
shell; n8n picks up rebuilt node files without a container restart.

Nodes loaded this way appear under the type prefix `CUSTOM.` (e.g. `CUSTOM.useMjmlRender`)
instead of `n8n-nodes-usemjml.`.

## Development

```bash
npm install
npm run build      # tsc + copy icons and translations into dist/
npm run lint
```

## Release

Releases are published to npm by [.github/workflows/publish.yml](.github/workflows/publish.yml)
with npm provenance, as n8n requires for community nodes. Set up Trusted Publishing (or an
`NPM_TOKEN` secret) as described in the workflow file, then run:

```bash
npm run release
```

This lints, builds, bumps the version, updates the changelog, commits, tags and pushes. The
pushed tag triggers the publish workflow.

## License

[MIT](LICENSE.md) © 2026 Tim Lochmüller
