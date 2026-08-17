<p align="center">
  <img src="./assets/glasses.svg" width="88" alt="Vision Bridge glasses icon">
</p>

<h1 align="center">dsh-vision-bridge</h1>

<p align="center"><sub>A vision layer for text-first DeepSeek models</sub></p>

<p align="center">
  <a href="./README.zh-CN.md">简体中文</a>
  ·
  <a href="#install">Install</a>
  ·
  <a href="#configure-vision-providers">Configure</a>
  ·
  <a href="#security">Security</a>
</p>

`dsh-vision-bridge` is an installable DeepSeek Harness bundle that adds image understanding to text-first model routes. It keeps the normal DeepSeek model list, adds a small glasses control to eligible models, and delegates image analysis to a separately configured vision provider.

The plugin supports Gemini-native, OpenAI-compatible Chat Completions/Responses, and Anthropic-compatible Messages APIs. The selected vision provider returns bounded text analysis; image blocks are never forwarded directly to the active DeepSeek model.

## Highlights

- **One model list:** Vision Bridge no longer appears as a duplicated provider group.
- **Per-model glasses toggle:** Gray means the bridge preference is off; blue means it is on.
- **Selection stays explicit:** Clicking the glasses only changes the preference. Clicking the model name selects the model and applies that preference.
- **Persistent without model churn:** Glasses preferences are remembered in the Harness web client without triggering a model switch or model-directory refresh.
- **Clear service provenance:** Hover the glasses to see the active vision provider and model.
- **Multiple vision providers:** Add, switch, and delete isolated provider profiles from Settings.
- **Native-vision aware:** Models that already advertise image input do not receive a bridge toggle.
- **Reasoning UI preserved:** The original Harness reasoning-effort menu remains unchanged.

## Model selector behavior

| Control | Result |
| --- | --- |
| Gray glasses | Vision Bridge is disabled for that model. |
| Blue glasses | Vision Bridge is enabled for that model. |
| Click glasses | Toggle and remember the preference only; the selected model does not change. |
| Click model name/row | Select the model. Blue routes through Vision Bridge; gray uses the normal upstream route. |
| Hover glasses | Show the vision provider and model that will perform image understanding. |

The glasses control appears only when a matching bridge route exists and the upstream model is text-only or has unknown image capability. The preference is stored per upstream model in the local Harness client.

## How it works

1. Enable the glasses for an eligible DeepSeek model, then click the model name to select it.
2. Attach an image and ask a visual question normally.
3. Harness validates and stores the attachment in the session.
4. The bridge route replaces image blocks only in the provider-bound request copy with controlled attachment markers. The original session and transcript keep the images.
5. DeepSeek calls `vision_bridge`; the tool reads the latest session image through Harness attachment services.
6. The plugin sends a bounded request to the configured vision provider and returns only its text analysis to the active agent.

Explicit workspace paths remain supported through `image_paths`; they are resolved with Harness filesystem policy.

## Requirements

- DeepSeek Harness `0.1.0-rc.5` or a compatible `0.1.x` release
- Node.js `^22.19` or `>=24`
- An API key for at least one image-capable endpoint

The backward-compatible default profile uses `GOOGLE_API_KEY`, the Gemini native endpoint, and `gemini-3.6-flash`.

## Install

### From GitHub

Release tags include built `lib/` artifacts:

```sh
dsh plugin --profile web add github:GXX182/dsh-vision-bridge#v0.1.0
```

Pin a tag or commit. A moving branch can change trusted plugin code outside the agent sandbox on the next install.

If Harness is started with `npx`:

```sh
npx @deepseek-ai/dsh plugin --profile web add github:GXX182/dsh-vision-bridge#v0.1.0
npx @deepseek-ai/dsh plugin --profile web list
npx @deepseek-ai/dsh web
```

The persistent `web` profile is stored under `~/.dsh/profiles/web` unless `DSH_HOME` is changed.

### From a checkout

```sh
npm install
npm run build
dsh plugin --profile web add .
dsh --profile web --dump-config
dsh --profile web
```

The config dump should contain a `dsh-vision-bridge` layer and a `vision-bridge` row.

## Configure vision providers

Open **Settings → Plugins → Plugin configuration → Image understanding**.

Each provider profile contains:

- a display name;
- an HTTPS Base URL;
- an API format (`auto`, Gemini, OpenAI compatible, or Anthropic compatible);
- its own credential;
- a selected image-capable model.

Adding a provider first verifies its model-list endpoint. The credential is stored through Harness credential services; the complete key is never returned to the browser. Switching providers immediately updates the glasses tooltip, including the selected provider name and model.

### Provider actions

- **Add:** Enter the provider details. The profile is saved only after model discovery succeeds.
- **Switch:** Choose another provider from the provider picker; its model list is loaded automatically.
- **Choose a model:** Select from the discovered model list—there is no free-form model field.
- **Delete:** Hover or focus a provider option and use its delete control. Its managed credential is removed with it.

### Protocol detection

With `apiFormat: auto`, complete endpoint paths take priority, followed by official hosts and version paths:

- `:generateContent`, `/v1beta`, or `generativelanguage.googleapis.com` → Gemini native
- `/v1/messages` or `api.anthropic.com` → Anthropic compatible
- `/chat/completions` or `/responses` → OpenAI compatible
- any other relay URL → OpenAI compatible

Set the format explicitly when an ambiguous relay uses Gemini or Anthropic semantics. The plugin never probes several protocols by resending the same image.

## Advanced bundle configuration

The schema defaults work without editing the patch. To override them, replace the inserted row's complete `config` in the profile `cordis.patch.yml`:

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

## Use the tool directly

Conversation attachments normally require no explicit tool instruction. For a workspace file, ask the agent:

> Use `vision_bridge` to inspect `screens/settings.png`. List the visible controls and validation errors.

Code Mode can call `await tools.vision_bridge(...)`. Omit image arguments for the latest conversation attachment, use `attachment_ids` for specific session images, or use `image_paths` for workspace files.

## Security

- Images are sent to the configured vision endpoint. Do not use an endpoint that is not allowed to receive them.
- Only HTTPS provider endpoints are accepted.
- File formats are detected from bytes instead of trusted extensions.
- Per-image, aggregate-image, question, response, answer, token, and time limits are enforced.
- API keys are resolved Host-side and are never included in tool results or browser responses.
- Text inside images is treated as untrusted evidence, not as an instruction.

## Known limitations

- Provider requests send image bytes inline; remote image URLs and file/video upload APIs are not supported.
- Unknown Base URLs default to OpenAI compatibility unless `apiFormat` is explicit.
- The bridge returns the provider's text analysis; it does not independently verify OCR, measurements, or safety-critical conclusions.
- Custom `llm/stream` middleware observes both the bridge request and its delegated upstream request.

## Development

```sh
npm install
npm run verify
npm pack --dry-run
```

Built `lib/` artifacts are intentionally committed for direct GitHub installation.

## License

MIT
