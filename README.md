# dsh-vision-bridge

[简体中文](README.zh-CN.md)

`dsh-vision-bridge` is an installable DeepSeek Harness bundle. It contributes a Cordis plugin that lets a text-only DeepSeek route delegate local PNG, JPEG, WebP, or GIF understanding to Gemini, then returns only bounded text analysis to the active agent.

This is a Harness plugin, not an agent skill. The bundle manifest activates the plugin through `cordis.patch.yml`; the plugin registers the `vision_bridge` tool and its model guidance through Harness services.

## How it works

1. The agent calls `vision_bridge` with a focused question and local image paths.
2. The plugin resolves and reads those paths through `ctx.fs`, preserving the session workspace and filesystem policy.
3. It detects each image format from its bytes and applies per-image and aggregate bounds.
4. It resolves `GOOGLE_API_KEY` through `ctx.credentials` for that call.
5. It sends a bounded request to Gemini and returns text-only analysis as the canonical tool result.

Images are sent to the configured Google endpoint. They are not sent as image blocks to the active DeepSeek model. Do not use the plugin for images you are not allowed to disclose to that endpoint.

## Requirements

- DeepSeek Harness `0.1.0-rc.5` or a compatible `0.1.x` release
- Node.js `^22.19` or `>=24`
- A `GOOGLE_API_KEY` credential

The default model is `gemini-3.6-flash`. See Google's [model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash) for current availability and input support.

## Install from a checkout

Build once, then add the bundle to a profile:

```sh
npm install
npm run build
dsh plugin --profile web add .
dsh --profile web --dump-config
dsh --profile web
```

The config dump should contain a `dsh-vision-bridge` layer and a `vision-bridge` row.

## Install from GitHub

Release tags include built `lib/` artifacts, so users do not need to allow dependency build scripts:

```sh
dsh plugin --profile web add github:<owner>/dsh-vision-bridge#v0.1.0
```

Pin a tag or commit. A moving branch can change trusted plugin code outside the agent sandbox on the next install.

## Configure

The bundle works with schema defaults. Override the inserted row in the profile's `cordis.patch.yml`; a Harness patch replaces the complete `config`, so restate every value you need:

```yaml
- id: vision-bridge
  config:
    apiKeyEnv: GOOGLE_API_KEY
    baseURL: https://generativelanguage.googleapis.com/v1beta
    model: gemini-3.6-flash
    maxImages: 8
    maxImageBytes: 8388608
    maxTotalImageBytes: 12582912
    maxQuestionChars: 8000
    maxOutputTokens: 4096
    maxResponseBytes: 524288
    maxAnswerBytes: 131072
    timeoutMs: 90000
```

Set `GOOGLE_API_KEY` through the Harness credential provider or its supported environment source. The tool schema never accepts a literal key, and the plugin resolves the reference for every operation.

## Use

Ask the agent directly:

> Use vision_bridge to inspect `screens/settings.png`. List the visible controls and any validation errors.

The tool also works through Code Mode as `await tools.vision_bridge(...)` without a separate adapter.

## Security and limits

- Only HTTPS provider endpoints are accepted.
- Supported formats are detected from file bytes, not trusted from extensions.
- Per-image, aggregate-image, question, response, answer, output-token, and time limits are configurable and enforced.
- Provider diagnostics are bounded and API keys are never included in results.
- Text visible inside an image is treated as untrusted evidence, not an instruction.

## Model Experience

### System-prompt guidance

#### What the model sees

The plugin adds one stable instruction telling the agent when to use `vision_bridge`, to choose the smallest relevant image set, and to preserve uncertainty in the secondary-model result.

#### Token effect

A fixed instruction and the `vision_bridge` tool schema are added to each request where the plugin is active. A successful call adds the bounded visual analysis to session history.

#### KV Cache effect

The prompt prefix is stable while plugin configuration and visible tool composition are unchanged. Tool results append to the conversation and do not rewrite earlier prompt content.

## Known Limitations and Deferred Work

- Browser attachment interception is not included in `0.1.0`; the tool accepts paths visible to the configured Harness filesystem provider.
- Gemini receives image bytes inline. File/video upload APIs and remote image URLs are not supported.
- The plugin returns the provider's text analysis; it does not independently verify OCR, measurements, or safety-critical conclusions.

## Development

```sh
npm install
npm run verify
npm pack --dry-run
```

Built `lib/` artifacts are intentionally committed for direct GitHub installation.

## License

MIT
