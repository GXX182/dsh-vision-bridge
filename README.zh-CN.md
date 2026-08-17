<p align="center">
  <img src="./assets/glasses.svg" width="88" alt="Vision Bridge 眼镜图标">
</p>

<h1 align="center">dsh-vision-bridge</h1>

<p align="center"><sub>为 DeepSeek Harness 中的文本模型扩展视觉能力</sub></p>

<p align="center">
  <a href="./README.md">English</a>
  ·
  <a href="#安装">安装</a>
  ·
  <a href="#配置视觉-provider">配置</a>
  ·
  <a href="#安全边界">安全</a>
</p>

`dsh-vision-bridge` 是一个可安装的 DeepSeek Harness bundle，用来为文本模型路由补充图片理解能力。它保留 Harness 原有的模型列表，只在适合桥接的模型右侧增加一个眼镜开关，并把图片分析委托给单独配置的视觉 Provider。

插件支持 Gemini 原生协议、OpenAI 兼容的 Chat Completions/Responses，以及 Anthropic 兼容的 Messages API。视觉 Provider 只返回有长度限制的文本分析；图片块不会直接发送给当前上游模型。

## 功能亮点

- **一个模型列表：** 不再显示重复的 `DeepSeek + Vision Bridge` Provider 分组。
- **逐模型眼镜开关：** 灰色表示关闭视觉桥接，蓝色表示开启。
- **选择操作保持明确：** 点击眼镜只修改开关；点击模型名称才会真正选择模型并应用开关状态。
- **长期记忆且不打断：** 开关状态保存在 Harness 网页客户端，不会触发模型切换或模型列表刷新。
- **服务来源可见：** 悬停眼镜即可查看实际提供识图服务的 Provider 和模型。
- **支持多个视觉 Provider：** 可以在设置中添加、切换和删除相互隔离的 Provider 配置。
- **识别原生视觉能力：** 已声明支持图片输入的模型不会显示桥接眼镜。
- **保留原生推理强度：** Harness 原有的推理强度菜单结构与位置保持不变。

## 模型选择器规则

| 操作或状态           | 结果                                               |
| -------------------- | -------------------------------------------------- |
| 灰色眼镜             | 该模型未开启视觉桥接。                             |
| 蓝色眼镜             | 该模型已开启视觉桥接。                             |
| 点击眼镜             | 只切换并记住偏好，不改变当前选中的模型。           |
| 点击模型名称或模型行 | 选择模型；蓝色时走视觉桥接，灰色时走普通上游路由。 |
| 悬停眼镜             | 显示负责图片理解的视觉 Provider 和模型。           |

只有在存在对应桥接路由，并且上游模型是纯文本或图片能力未知时，才会显示眼镜。开关偏好按上游模型保存在本地 Harness 客户端中。

## 工作原理

1. 为可桥接的文本模型开启眼镜，然后点击模型名称完成选择。
2. 像平常一样附加图片并提出视觉问题。
3. Harness 校验图片并把附件保存在当前 session 中。
4. 桥接路由只在发给 Provider 的请求副本中，把图片块替换成受控附件标记；原始 session 和聊天记录仍保留图片。
5. 当前上游模型调用 `vision_bridge`，工具通过 Harness 附件服务读取最近的会话图片。
6. 插件向当前视觉 Provider 发起有边界限制的请求，只把文本分析返回给当前 Agent。

仍然支持显式 `image_paths`；工作区路径通过 Harness 文件系统策略解析。

## 环境要求

- DeepSeek Harness `0.1.0-rc.5` 或兼容的 `0.1.x` 版本
- Node.js `^22.19` 或 `>=24`
- 一个支持 Harness 工具调用的上游模型路由
- 至少一个支持图片输入的服务端点及其 API Key

为了兼容旧配置，默认 Provider 使用 `GOOGLE_API_KEY`、Gemini 原生端点和 `gemini-3.6-flash`。

## 安装

### 从 GitHub 安装

安装语义化版本最高的发布标签：

```sh
dsh plugin --profile web add "github:GXX182/dsh-vision-bridge#semver:*"
```

`#semver:*` 会选择 GitHub 上符合语义化版本的最新标签。需要可复现安装时，请固定具体标签，例如 `#v0.2.0`。

如果使用 `npx` 启动 Harness：

```sh
npx @deepseek-ai/dsh plugin --profile web add "github:GXX182/dsh-vision-bridge#semver:*"
npx @deepseek-ai/dsh plugin --profile web list
npx @deepseek-ai/dsh web
```

除非修改 `DSH_HOME`，持久化的 `web` profile 默认保存在 `~/.dsh/profiles/web`。

### 从本地仓库安装

```sh
npm install
npm run build
dsh plugin --profile web add .
dsh --profile web --dump-config
dsh --profile web
```

配置输出中应包含 `dsh-vision-bridge` 层和 `vision-bridge` 插件行。

## 配置视觉 Provider

打开 **设置 → 插件 → 插件配置 → 图片理解**。

每个 Provider 配置包含：

- 自定义显示名称；
- HTTPS Base URL；
- 接口格式（自动识别、Gemini、OpenAI 兼容或 Anthropic 兼容）；
- 独立凭证；
- 一个已选择的视觉模型。

添加 Provider 时会先验证模型列表接口。凭证通过 Harness 凭证服务保存，完整 Key 永远不会返回浏览器。切换 Provider 后，眼镜的悬停提示会立即更新为新的 Provider 名称和模型。

### Provider 操作

- **添加：** 填写 Provider 信息；只有模型发现成功后才会保存。
- **切换：** 在 Provider 下拉列表中选择另一项，随后自动加载对应模型列表。
- **选择模型：** 从发现到的模型列表中选择，不需要手动输入模型名。
- **删除：** 悬停或聚焦 Provider 选项后使用删除按钮，托管凭证会一并删除。

### 协议自动识别

使用 `apiFormat: auto` 时，插件先检查完整接口路径，再检查官方域名与版本路径：

- `:generateContent`、`/v1beta` 或 `generativelanguage.googleapis.com` → Gemini 原生协议
- `/v1/messages` 或 `api.anthropic.com` → Anthropic 兼容协议
- `/chat/completions` 或 `/responses` → OpenAI 兼容协议
- 其他中转地址 → OpenAI 兼容协议

如果一个不明确的中转地址实际使用 Gemini 或 Anthropic 语义，请显式设置接口格式。插件不会为了探测协议而把同一张图片重复发送给多个接口。

## 高级 bundle 配置

默认 schema 无需修改即可使用。如果需要覆盖，请在 profile 的 `cordis.patch.yml` 中完整替换该插件行的 `config`：

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

## 直接使用工具

会话附件通常不需要显式指定工具。如果要检查工作区文件，可以直接告诉 Agent：

> 使用 `vision_bridge` 检查 `screens/settings.png`，列出可见控件和校验错误。

Code Mode 可以调用 `await tools.vision_bridge(...)`。省略图片参数时使用最近的会话附件；使用 `attachment_ids` 指定 session 图片；使用 `image_paths` 读取工作区文件。

## 安全边界

- 图片会发送到当前配置的视觉端点，请勿使用无权接收这些图片的服务。
- 只接受 HTTPS Provider 端点。
- 根据文件字节识别图片格式，不信任扩展名。
- 单图、图片总量、问题、响应、答案、Token 和超时均有强制上限。
- API Key 只在 Host 侧解析，不会出现在工具结果或浏览器响应中。
- 图片中的文字按不可信证据处理，不会被当成指令执行。

## 已知限制

- Provider 请求以内联数据发送图片，不支持远程图片 URL、文件上传 API 或视频上传 API。
- 未知 Base URL 默认按 OpenAI 兼容协议处理，除非显式指定 `apiFormat`。
- 插件返回视觉 Provider 的文本分析，不会独立验证 OCR、测量结果或安全关键结论。
- 自定义 `llm/stream` 中间件会同时观察桥接请求和委托后的上游请求。

## 开发验证

```sh
npm install
npm run verify
npm pack --dry-run
```

仓库会提交构建后的 `lib/`，以支持直接从 GitHub 安装。

## 许可证

MIT
