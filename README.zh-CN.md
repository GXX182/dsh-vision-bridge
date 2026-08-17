# dsh-vision-bridge

[English](README.md)

`dsh-vision-bridge` 是一个可安装的 DeepSeek Harness bundle。它通过 Cordis 插件注册 `deepseek-vision-bridge` 路由和 `vision_bridge` 工具：把会话附件或本地 PNG、JPEG、WebP、GIF 交给外部识图 API 理解，再把有上限的纯文本分析交还给当前 Agent。

它是 Harness 插件，不是 Agent Skill。`package.json` 中的 `dsh.bundle` 声明和 `cordis.patch.yml` 负责安装与启用；工具、配置、凭证、文件系统和系统提示均使用 Harness 的标准扩展点。

插件支持 Gemini 原生协议、OpenAI 兼容的 Chat Completions/Responses 协议，以及 Anthropic 兼容的 Messages 协议。使用 `apiFormat: auto` 时，插件根据 Base URL 自动识别协议；无法明确判断的中转站地址默认按 OpenAI 兼容协议处理。

## 工作原理

1. 在会话中选择 `DeepSeek + Vision Bridge` 路由，然后像平常一样粘贴或上传图片。
2. Harness 通过附件服务校验并保存图片，把不可变引用写入 session；聊天记录继续保留原图。
3. 桥接路由只在发给上游 DeepSeek 的请求副本中把图片块替换为受控文字标记，不修改 session。
4. DeepSeek 调用 `vision_bridge`。不传图片参数时，工具从当前 Agent session 查找最近一条带图片的用户消息，并通过 `ctx.attachments` 读取原图。
5. 插件通过 `ctx.credentials` 解析配置的凭证，根据 `apiFormat` 和 `baseURL` 选择视觉接口协议，发起有限制的请求，只把文本分析作为标准工具结果返回。

插件仍兼容显式 `image_paths`；此时通过 `ctx.fs` 解析和读取文件，沿用会话工作区与文件系统策略。

图片会发送到配置的视觉接口，但不会作为图片块发送给当前 DeepSeek 模型。不要用它处理无权向该接口披露的图片。

## 环境要求

- DeepSeek Harness `0.1.0-rc.5` 或兼容的 `0.1.x` 版本
- Node.js `^22.19` 或 `>=24`
- 配置的视觉接口所需的 API Key 凭证（为兼容旧配置，默认引用仍为 `GOOGLE_API_KEY`）

默认模型是 `gemini-3.6-flash`；实时能力和可用性以 Google 的[模型文档](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash)为准。

## 从本地仓库安装

```sh
npm install
npm run build
dsh plugin --profile web add .
dsh --profile web --dump-config
dsh --profile web
```

配置输出中应出现 `dsh-vision-bridge` 层和 `vision-bridge` 插件行。

## 从 GitHub 安装

发布标签会包含构建好的 `lib/`，因此用户不需要允许依赖执行构建脚本：

```sh
dsh plugin --profile web add github:GXX182/dsh-vision-bridge#v0.1.0
```

建议固定 tag 或 commit。插件代码在 Agent 沙箱之外运行，不应安装不受信任或会移动的分支。

### 使用 `npx` 启动 Harness 的用户

`npx @deepseek-ai/dsh web` 默认读取持久化的 `web` profile，因此插件不会因为 `npx` 下载的临时 CLI 被清理而消失。

安装插件：

```sh
npx @deepseek-ai/dsh plugin --profile web add github:GXX182/dsh-vision-bridge#v0.1.0
```

确认安装版本：

```sh
npx @deepseek-ai/dsh plugin --profile web list
```

然后启动 Harness：

```sh
npx @deepseek-ai/dsh web
```

插件默认保存在 `~/.dsh/profiles/web`。只要没有修改 `DSH_HOME`，以后每次执行 `npx @deepseek-ai/dsh web` 都会加载这个 profile。

移除插件：

```sh
npx @deepseek-ai/dsh plugin --profile web remove dsh-vision-bridge
```

安装时 pnpm 可能提示 Harness 服务包和 React 缺少 peer dependencies。这些包由当前运行的 Harness 发行版提供，仅出现该警告不代表安装失败；可以通过上面的 `list` 命令确认已安装 `dsh-vision-bridge@0.1.0`。

## 配置

默认配置可直接使用。如需覆盖，在 profile 的 `cordis.patch.yml` 中修改同一个 id。Harness patch 会整体替换 `config`，所以需要完整写出要保留的字段：

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

`apiFormat` 可设为 `auto`、`gemini-native`、`openai-compatible` 或 `anthropic-compatible`。自动识别会优先检查完整接口路径，再检查官方域名和版本路径：

- `:generateContent`、`/v1beta` 或 `generativelanguage.googleapis.com` → Gemini 原生协议
- `/v1/messages` 或 `api.anthropic.com` → Anthropic 兼容协议
- `/chat/completions` 或 `/responses` → OpenAI 兼容协议
- 其他中转站地址 → OpenAI 兼容协议

常见 OpenAI 兼容中转站可以这样配置：

```yaml
    apiKeyEnv: GOOGLE_API_KEY # 历史凭证名，值可以是中转站 Key
    apiFormat: auto
    baseURL: https://relay.example.com/v1
    model: vision-model
```

如果一个不明确的 Base URL 实际使用 Gemini 或 Anthropic 协议，请显式设置 `apiFormat`。插件不会轮询多个协议，也不会在供应商报错后把同一张图片重新发送给其他接口。Base URL 也可以填写完整的 `/chat/completions`、`/responses`、`/v1/messages` 或 `:generateContent` 接口地址。

打开 **设置 → 插件 → 插件配置 → 图片理解** 即可管理视觉 Provider。每个 Provider 由自定义名称、Base URL、接口协议和独立 API Key 组成。添加时会先验证该地址的模型列表接口；成功后，Key 写入 Harness 凭证库，Provider 列表写入 `$DSH_HOME/settings.yaml`，并自动选中、加载模型。所有变更都会实时生效。

Provider 下拉列表会显示“自定义名称 + Key 前后脱敏摘要”。删除按钮只在选项悬停或键盘聚焦时显示在右侧。切换 Provider 后会自动重新加载它自己的模型列表；更换模型也只影响当前 Provider，因此多个中转站的 Key、地址和模型不会串台。

完整 Key 永远不会返回浏览器。脱敏和模型发现均由 Host 通过仅限本机的通道完成，模型列表请求只会发送到所选 Provider 的 Base URL。原来的 `GOOGLE_API_KEY` 配置会作为默认 Provider 保留，以兼容旧配置。

### 在网页中管理 Provider

- **添加：** 点击 **添加 Provider**，填写名称、Base URL、接口协议和 Key。通常保留“自动识别”；只有模型列表验证成功才会保存。
- **切换：** 打开 Provider 下拉列表并选择一项，随后会自动获取对应模型。
- **选择模型：** 使用模型下拉框，不再手动输入模型名。
- **删除：** 悬停或聚焦某个 Provider 选项，点击其最右侧删除按钮；Provider 配置和托管凭证会一起删除。

当 Provider 列表为空时，只有当前会话选择了 `DeepSeek + Vision Bridge` 下的模型才会显示配置提示；新建普通模型会话不会弹出。提示中可以直接填写 Provider，验证模型列表成功后即可继续使用。

## 使用

处理会话附件时，请在模型选择器中选择 `DeepSeek + Vision Bridge` 下的模型，附加图片并直接提问。模型会收到受控的附件标记，再调用 `vision_bridge` 从当前 session 读取图片。

处理工作区路径时，可以直接告诉 Agent：

> 使用 vision_bridge 检查 `screens/settings.png`，列出可见控件和所有校验错误。

Code Mode 无需额外适配，可以直接调用 `await tools.vision_bridge(...)`。省略图片参数时使用最近的会话附件；用 `attachment_ids` 指定 session 中的图片；用 `image_paths` 读取工作区文件。

## 安全与限制

- 只接受 HTTPS 服务端点。
- 根据文件字节识别格式，不信任扩展名。
- 单图、图片总量、问题长度、HTTP 响应、分析文本、输出 token 和超时均有可配置上限。
- 服务端诊断会截断，结果中不会包含 API key。
- 图片中的文字按不可信证据处理，不会被当成指令执行。

## 模型体验

插件会增加一段固定工具指引和 `vision_bridge` 工具 schema。桥接路由只在发给上游的请求副本中把每个图片块替换成包含不透明附件 id 的短标记。成功调用后，受限长的视觉分析会追加到会话历史；只要插件配置与工具组合不变，请求前缀保持稳定。

## 已知限制与后续工作

- 自动识别会将未知 Base URL 默认视为 OpenAI 兼容接口；对于地址不明确的 Anthropic 或 Gemini 中转站，请显式覆盖 `apiFormat`。
- 普通 `deepseek-official` 路由仍然是纯文本路由；会话附件必须选择单独注册的 `DeepSeek + Vision Bridge` 路由。
- 桥接路由通过公开 LLM 服务委托给上游路由，因此自定义 `llm/stream` 中间件会同时观察桥接请求和上游请求；有自定义计费、遥测或策略中间件的部署需要验证预期。
- 各协议均以内联数据发送图片，不支持文件/视频上传 API 与远程图片 URL。
- 插件返回识图供应商的文字分析，不独立验证 OCR、测量结果或安全关键结论。

## 开发验证

```sh
npm install
npm run verify
npm pack --dry-run
```

仓库会提交构建后的 `lib/`，用于直接从 GitHub 安装。

## 许可证

MIT
