# dsh-vision-bridge

[简体中文](README.zh-CN.md)

`dsh-vision-bridge` is an installable DeepSeek Harness bundle. It contributes a Cordis plugin that lets a text-only DeepSeek route delegate session or local PNG, JPEG, WebP, or GIF understanding to an external vision API, then returns only bounded text analysis to the active agent.

This is a Harness plugin, not an agent skill. The bundle manifest activates the plugin through `cordis.patch.yml`; the plugin registers the `deepseek-vision-bridge` provider route, the `vision_bridge` tool, and its model guidance through Harness services.

The current release uses Google Gemini as its vision provider. Support for additional image-understanding providers is planned for future releases.

## How it works

1. Select the `DeepSeek + Vision Bridge` provider route and attach images normally in the Harness conversation.
2. Harness validates and stores the images through its attachment service, then records their immutable references in the session.
3. The bridge provider replaces image blocks only in the upstream request copy with controlled text markers; the durable session and transcript keep the original images.
4. DeepSeek calls `vision_bridge` with a focused question. With no image arguments, the tool finds the latest user message containing images in the current Agent session and reads them through `ctx.attachments`.
5. The plugin resolves `GOOGLE_API_KEY` through `ctx.credentials`, sends a bounded request to Gemini, and returns text-only analysis as the canonical tool result.

Explicit `image_paths` remain supported. Those paths are resolved through `ctx.fs`, preserving the session workspace and filesystem policy.

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
dsh plugin --profile web add github:GXX182/dsh-vision-bridge#v0.1.0
```

Pin a tag or commit. A moving branch can change trusted plugin code outside the agent sandbox on the next install.

## Configure

The bundle works with schema defaults. Override the inserted row in the profile's `cordis.patch.yml`; a Harness patch replaces the complete `config`, so restate every value you need:

```yaml
- id: vision-bridge
  config:
    bridgeProvider: deepseek-vision-bridge
    upstreamProvider: deepseek-official
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

When you switch to a model under `DeepSeek + Vision Bridge` and `GOOGLE_API_KEY` is missing, the plugin opens **Configure the vision API key**. Ordinary DeepSeek routes, page startup, and merely opening the model menu do not trigger it. Saving writes the key through the existing `credentials.set` API; the next tool call can use it without restarting the server. Choosing **Configure later** dismisses that prompt; selecting a Vision Bridge model again will prompt while the credential is still missing.

After setup, open **Settings → Plugins → Plugin configuration → Image understanding** to inspect the credential status, replace the key, or remove it. The current key is identified only as its first four characters, `****`, and its final four characters. Masking happens through a loopback-only Host channel; the complete credential is never returned to the browser.

You may instead set `GOOGLE_API_KEY` through another Harness credential-provider source or the launching environment. The tool schema never accepts a literal key, and the plugin resolves the reference for every operation. The browser prompt currently targets the default `GOOGLE_API_KEY` reference; deployments overriding `apiKeyEnv` must configure that custom reference outside the popup.

## Use

For conversation attachments, select a model under `DeepSeek + Vision Bridge`, attach an image, and ask the visual question normally. The model receives a controlled attachment marker and calls `vision_bridge`; the tool reads the image from the current session.

For explicit workspace paths, ask the agent directly:

> Use vision_bridge to inspect `screens/settings.png`. List the visible controls and any validation errors.

The tool also works through Code Mode as `await tools.vision_bridge(...)` without a separate adapter. Omit both image arguments for the latest conversation attachment, pass `attachment_ids` for specific session images, or pass `image_paths` for workspace files.

## Security and limits

- Only HTTPS provider endpoints are accepted.
- Supported formats are detected from file bytes, not trusted from extensions.
- Per-image, aggregate-image, question, response, answer, output-token, and time limits are configurable and enforced.
- Provider diagnostics are bounded and API keys are never included in results.
- Text visible inside an image is treated as untrusted evidence, not an instruction.

## Model Experience

### System-prompt guidance

#### What the model sees

The plugin adds one stable instruction explaining session-backed image markers, when to use `vision_bridge`, and how to preserve uncertainty in the secondary-model result. The bridge route replaces each image block with one controlled text marker only in the provider-bound request copy.

#### Token effect

A fixed instruction and the `vision_bridge` tool schema are added to each request where the plugin is active. Each bridged image contributes a short marker containing its opaque attachment id. A successful call adds the bounded visual analysis to session history.

#### KV Cache effect

The prompt prefix is stable while plugin configuration and visible tool composition are unchanged. Tool results append to the conversation and do not rewrite earlier prompt content.

## Known Limitations and Deferred Work

- Google Gemini is the only vision provider in the current release. Additional providers and provider-selection configuration are planned.
- The ordinary `deepseek-official` provider remains text-only. Users must select the separately registered `DeepSeek + Vision Bridge` route for conversation attachments.
- The browser prompt currently recognizes the default `deepseek-vision-bridge` provider id. Deployments overriding `bridgeProvider` must configure the credential through Settings or another credential source.
- The bridge route delegates to the configured upstream route through the public LLM service. Harness `llm/stream` middleware therefore observes both the bridge request and its delegated upstream request; deployments with custom middleware should test their accounting and policy expectations.
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
