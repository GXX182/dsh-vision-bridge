# dsh-vision-bridge

[English](README.md)

`dsh-vision-bridge` 是一个可安装的 DeepSeek Harness bundle。它通过 Cordis 插件注册 `deepseek-vision-bridge` 路由和 `vision_bridge` 工具：把会话附件或本地 PNG、JPEG、WebP、GIF 交给外部识图 API 理解，再把有上限的纯文本分析交还给当前 Agent。

它是 Harness 插件，不是 Agent Skill。`package.json` 中的 `dsh.bundle` 声明和 `cordis.patch.yml` 负责安装与启用；工具、配置、凭证、文件系统和系统提示均使用 Harness 的标准扩展点。

当前版本使用 Google Gemini 作为识图能力供应商；后续版本计划增加更多识图供应商。

## 工作原理

1. 在会话中选择 `DeepSeek + Vision Bridge` 路由，然后像平常一样粘贴或上传图片。
2. Harness 通过附件服务校验并保存图片，把不可变引用写入 session；聊天记录继续保留原图。
3. 桥接路由只在发给上游 DeepSeek 的请求副本中把图片块替换为受控文字标记，不修改 session。
4. DeepSeek 调用 `vision_bridge`。不传图片参数时，工具从当前 Agent session 查找最近一条带图片的用户消息，并通过 `ctx.attachments` 读取原图。
5. 插件通过 `ctx.credentials` 解析 `GOOGLE_API_KEY`，向 Gemini 发起有限制的请求，只把文本分析作为标准工具结果返回。

插件仍兼容显式 `image_paths`；此时通过 `ctx.fs` 解析和读取文件，沿用会话工作区与文件系统策略。

图片会发送到配置的 Google 接口，但不会作为图片块发送给当前 DeepSeek 模型。不要用它处理无权向该接口披露的图片。

## 环境要求

- DeepSeek Harness `0.1.0-rc.5` 或兼容的 `0.1.x` 版本
- Node.js `^22.19` 或 `>=24`
- `GOOGLE_API_KEY` 凭证

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

切换到 `DeepSeek + Vision Bridge` 分组下的模型时，如果尚未配置 `GOOGLE_API_KEY`，插件会显示“配置图片理解 API Key”弹窗。普通 DeepSeek 路由、页面启动以及仅打开模型菜单都不会触发。保存操作调用现有 `credentials.set` 接口，下一次工具调用即可使用，无需重启服务。选择“稍后配置”会关闭本次提示；凭证仍缺失时，再次选择 Vision Bridge 模型会重新提示。

配置完成后，可随时在 **设置 → 插件 → 插件配置 → 图片理解** 中查看状态、输入新 Key 覆盖旧 Key，或删除凭证。当前 Key 仅以“前 4 位 + `****` + 后 4 位”的脱敏标识显示；脱敏在只允许本机访问的 Host 通道中完成，完整 Key 不会从凭证服务返回给浏览器。

也可以通过 Harness 凭证提供方的其他来源或启动环境设置 `GOOGLE_API_KEY`。工具参数不接受明文 key，插件每次操作都会重新解析凭证引用。当前 Web 弹窗固定管理默认的 `GOOGLE_API_KEY`；如果部署覆盖了 `apiKeyEnv`，需要在弹窗外配置对应的自定义凭证引用。

### 在网页中管理 Google API Key

网页配置管理的是默认 `GOOGLE_API_KEY` 凭证：

- **首次设置：** 在模型选择器中切换到 `DeepSeek + Vision Bridge` 下的模型。缺少 Key 时，在弹窗中输入并点击 **保存并继续**。也可以打开 **设置 → 插件 → 插件配置 → 图片理解**，展开配置卡片，输入 Key 后点击 **保存 API Key**。
- **更换 Key：** 打开 **设置 → 插件 → 插件配置 → 图片理解**。当前 Key 只显示脱敏标识；在 **Google API Key** 输入框填写新 Key，然后点击 **替换 API Key**。
- **删除 Key：** 在同一张配置卡片中点击 **删除 Key**，再确认删除。下次切换到 Vision Bridge 模型时，配置弹窗会再次出现。

浏览器不会读取或显示已保存的完整 Key。如果 `GOOGLE_API_KEY` 来自只读凭证提供方或启动环境，网页无法替换或删除它；需要修改对应的凭证来源，并在需要时重启 Harness。

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

- 当前版本仅支持 Google Gemini；后续计划增加其他识图能力供应商以及对应的供应商选择配置。
- 普通 `deepseek-official` 路由仍然是纯文本路由；会话附件必须选择单独注册的 `DeepSeek + Vision Bridge` 路由。
- 当前 Web 弹窗按默认的 `deepseek-vision-bridge` provider id 识别桥接路由；如果部署覆盖了 `bridgeProvider`，需要通过设置页或其他凭证来源进行配置。
- 桥接路由通过公开 LLM 服务委托给上游路由，因此自定义 `llm/stream` 中间件会同时观察桥接请求和上游请求；有自定义计费、遥测或策略中间件的部署需要验证预期。
- Gemini 目前以内联数据接收图片，不支持文件/视频上传 API 与远程图片 URL。
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
