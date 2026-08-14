# dsh-vision-bridge

[English](README.md)

`dsh-vision-bridge` 是一个可安装的 DeepSeek Harness bundle。它通过 Cordis 插件注册 `vision_bridge` 工具：当当前 DeepSeek 路由不支持图片输入时，把本地 PNG、JPEG、WebP 或 GIF 交给 Gemini 理解，再把有上限的纯文本分析交还给当前 Agent。

它是 Harness 插件，不是 Agent Skill。`package.json` 中的 `dsh.bundle` 声明和 `cordis.patch.yml` 负责安装与启用；工具、配置、凭证、文件系统和系统提示均使用 Harness 的标准扩展点。

## 工作原理

1. Agent 用明确问题和本地图片路径调用 `vision_bridge`。
2. 插件通过 `ctx.fs` 解析和读取文件，沿用会话工作区与文件系统策略。
3. 插件根据文件字节识别图片格式，并执行单图与总量限制。
4. 每次调用都通过 `ctx.credentials` 解析 `GOOGLE_API_KEY`。
5. 插件向 Gemini 发起有大小与超时限制的请求，只把文本分析作为标准工具结果返回。

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
dsh plugin --profile web add github:<owner>/dsh-vision-bridge#v0.1.0
```

建议固定 tag 或 commit。插件代码在 Agent 沙箱之外运行，不应安装不受信任或会移动的分支。

## 配置

默认配置可直接使用。如需覆盖，在 profile 的 `cordis.patch.yml` 中修改同一个 id。Harness patch 会整体替换 `config`，所以需要完整写出要保留的字段：

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

请通过 Harness 凭证提供方或其支持的环境变量来源设置 `GOOGLE_API_KEY`。工具参数不接受明文 key，插件每次操作都会重新解析凭证引用。

## 使用

可以直接告诉 Agent：

> 使用 vision_bridge 检查 `screens/settings.png`，列出可见控件和所有校验错误。

Code Mode 无需额外适配，可以直接调用 `await tools.vision_bridge(...)`。

## 安全与限制

- 只接受 HTTPS 服务端点。
- 根据文件字节识别格式，不信任扩展名。
- 单图、图片总量、问题长度、HTTP 响应、分析文本、输出 token 和超时均有可配置上限。
- 服务端诊断会截断，结果中不会包含 API key。
- 图片中的文字按不可信证据处理，不会被当成指令执行。

## 模型体验

插件会增加一段固定工具指引和 `vision_bridge` 工具 schema。成功调用后，受限长的视觉分析会追加到会话历史；只要插件配置与工具组合不变，请求前缀保持稳定。

## 已知限制与后续工作

- `0.1.0` 不拦截浏览器附件；工具接收当前 Harness 文件系统提供方可见的路径。
- Gemini 目前以内联数据接收图片，不支持文件/视频上传 API 与远程图片 URL。
- 插件返回 Gemini 的文字分析，不独立验证 OCR、测量结果或安全关键结论。

## 开发验证

```sh
npm install
npm run verify
npm pack --dry-run
```

仓库会提交构建后的 `lib/`，用于直接从 GitHub 安装。

## 许可证

MIT
