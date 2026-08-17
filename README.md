# dsh-vision-bridge

[简体中文](README.zh-CN.md)

`dsh-vision-bridge` is an installable DeepSeek Harness bundle. It contributes a Cordis plugin that lets a text-only DeepSeek route delegate session or local PNG, JPEG, WebP, or GIF understanding to an external vision API, then returns only bounded text analysis to the active agent.

This is a Harness plugin, not an agent skill. The bundle manifest activates the plugin through `cordis.patch.yml`; the plugin registers the `deepseek-vision-bridge` provider route, the `vision_bridge` tool, and its model guidance through Harness services.

The plugin supports Gemini-native, OpenAI-compatible Chat Completions/Responses, and Anthropic-compatible Messages APIs. With `apiFormat: auto`, it infers the wire format from the configured Base URL and uses OpenAI compatibility for otherwise ambiguous relay URLs.

## How it works

1. Select the `DeepSeek + Vision Bridge` provider route and attach images normally in the Harness conversation.
2. Harness validates and stores the images through its attachment service, then records their immutable references in the session.
3. The bridge provider replaces image blocks only in the upstream request copy with controlled text markers; the durable session and transcript keep the original images.
4. DeepSeek calls `vision_bridge` with a focused question. With no image arguments, the tool finds the latest user message containing images in the current Agent session and reads them through `ctx.attachments`.
5. The plugin resolves the configured credential through `ctx.credentials`, selects the vision wire format from `apiFormat` and `baseURL`, sends a bounded provider request, and returns text-only analysis as the canonical tool result.

Explicit `image_paths` remain supported. Those paths are resolved through `ctx.fs`, preserving the session workspace and filesystem policy.

Images are sent to the configured vision endpoint. They are not sent as image blocks to the active DeepSeek model. Do not use the plugin for images you are not allowed to disclose to that endpoint.

## Requirements

- DeepSeek Harness `0.1.0-rc.5` or a compatible `0.1.x` release
- Node.js `^22.19` or `>=24`
- An API-key credential for the configured vision endpoint (`GOOGLE_API_KEY` by default for backward compatibility)

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

### Users who start Harness with `npx`

`npx @deepseek-ai/dsh web` reads the persistent `web` profile, so plugins do not disappear when the temporary `npx` CLI download is cleaned up.

Install the plugin:

```sh
npx @deepseek-ai/dsh plugin --profile web add github:GXX182/dsh-vision-bridge#v0.1.0
```

Confirm the installed version:

```sh
npx @deepseek-ai/dsh plugin --profile web list
```

Then start Harness:

```sh
npx @deepseek-ai/dsh web
```

By default, the plugin is stored under `~/.dsh/profiles/web`. Every later `npx @deepseek-ai/dsh web` invocation loads that profile as long as `DSH_HOME` is unchanged.

Remove the plugin with:

```sh
npx @deepseek-ai/dsh plugin --profile web remove dsh-vision-bridge
```

pnpm may report missing peer dependencies for Harness service packages and React during installation. Those packages are supplied by the running Harness distribution; the warning alone does not mean installation failed. Use the `list` command above to confirm that `dsh-vision-bridge@0.1.0` is installed.

## Configure

The bundle works with schema defaults. Override the inserted row in the profile's `cordis.patch.yml`; a Harness patch replaces the complete `config`, so restate every value you need:

```yaml
- id: vision-bridge
  config:
    bridgeProvider: deepseek-vision-bridge
    upstreamProvider: deepseek-official
    apiKeyEnv: GOOGLE_API_KEY
    apiFormat: auto
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

`apiFormat` accepts `auto`, `gemini-native`, `openai-compatible`, or `anthropic-compatible`. Automatic detection uses complete endpoint paths first, then official hosts and version paths:

- `:generateContent`, `/v1beta`, or `generativelanguage.googleapis.com` → Gemini native
- `/v1/messages` or `api.anthropic.com` → Anthropic compatible
- `/chat/completions` or `/responses` → OpenAI compatible
- Any other relay URL → OpenAI compatible

For example, a typical OpenAI-compatible relay can be configured as:

```yaml
    apiKeyEnv: GOOGLE_API_KEY # legacy reference name; the value may be a relay key
    apiFormat: auto
    baseURL: https://relay.example.com/v1
    model: vision-model
```

Set `apiFormat` explicitly when an ambiguous Base URL exposes a non-OpenAI protocol. The plugin does not probe multiple protocols or resend an image after a provider error. A Base URL may also be a complete `/chat/completions`, `/responses`, `/v1/messages`, or `:generateContent` endpoint.

Open **Settings → Plugins → Plugin configuration → Image understanding** to manage vision providers. A provider combines a custom display name, Base URL, API format, and its own API key. Adding one first verifies its model-list endpoint, stores the key in the Harness credential store, saves the provider directory in `$DSH_HOME/settings.yaml`, selects it, and loads its models. Changes apply live.

The provider picker shows each custom name together with the key's masked first and final characters. Its delete control appears when an option is hovered or keyboard-focused. Selecting another provider automatically reloads that provider's models; changing the model updates only that provider. This keeps keys, endpoints, and model choices isolated across multiple relays.

The complete stored key is never returned to the browser. Masking and model discovery happen Host-side through loopback-only calls, and a model-list request goes only to the selected provider's configured Base URL. The original `GOOGLE_API_KEY` configuration remains as the default provider for backward compatibility.

### Manage providers in the Web UI

- **Add:** choose **Add provider**, then enter a name, Base URL, API format, and key. Auto detect is the usual choice. The provider is added only after its model directory succeeds.
- **Switch:** open the provider picker and select an option. Its model list loads automatically.
- **Choose a model:** use the model dropdown; there is no free-form model field.
- **Delete:** hover or focus a provider option and use the delete button at its right edge. The provider entry and its managed credential are removed together.

When the provider list is empty, setup appears only if the current conversation selects a model under `DeepSeek + Vision Bridge`; a new conversation using an ordinary model does not prompt. A provider can be added directly in the prompt and becomes usable after its model directory is verified.

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

- Automatic detection intentionally defaults unknown Base URLs to OpenAI compatibility. Use the explicit `apiFormat` override for ambiguous Anthropic or Gemini relays.
- The ordinary `deepseek-official` provider remains text-only. Users must select the separately registered `DeepSeek + Vision Bridge` route for conversation attachments.
- The bridge route delegates to the configured upstream route through the public LLM service. Harness `llm/stream` middleware therefore observes both the bridge request and its delegated upstream request; deployments with custom middleware should test their accounting and policy expectations.
- Provider requests carry image bytes inline. File/video upload APIs and remote image URLs are not supported.
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
