## Perplexity Auto Model Selector（Tampermonkey）

自动在 Perplexity 打开"Choose a model"/"选择一个模型"菜单并选择你偏好的模型品牌/版本。已验证在 Windows + Edge/Chrome 下稳定工作，支持中英文界面。

### 主要功能
- 自动打开模型菜单并选择偏好项
- 支持“品牌级”泛化匹配：例如 `GPT`、`Claude`、`Gemini`
- 支持排除词（如 `thinking`、`reasoning`）
- 时效性窗口与用户干预即停：便于手动改选

### 文件位置
- 用户脚本：`pplx-js/perplexity-auto-model.user.js`

### 安装
1. 安装 Tampermonkey（Edge/Chrome 扩展商店）。
2. 打开 `pplx-js/perplexity-auto-model.user.js`，复制全部内容，在 Tampermonkey 中“新增脚本”粘贴并保存；或将该文件托拽到浏览器导入。

若托管到 GitHub，可直接用 Raw 地址一键安装（示例）：
```
https://raw.githubusercontent.com/<你的GitHub用户名>/<你的仓库>/main/pplx-js/perplexity-auto-model.user.js
```

### 配置
在脚本顶部可调：
```js
// 品牌优先级，按从左到右匹配
const PREFERRED_MODELS = ['Claude', 'GPT', 'Gemini'];

// 可选：排除包含以下关键词的候选项
const EXCLUDE_SUBSTRINGS = ['thinking', 'reasoning'];

// 自动切换“时效性”窗口（毫秒）。超时后完全不再干预，便于手动选择
const ENFORCE_DURATION_MS = 8000;

// 用户手动点过模型菜单/菜单项后，立即停止本次自动切换
const STOP_ON_USER_INTERACTION = true;
```

### 使用小贴士
- 想完全手动：将 `ENFORCE_DURATION_MS` 设为 `0` 或在 Tampermonkey 暂停此脚本。
- 想更强制：增大 `ENFORCE_DURATION_MS`，但依然可以通过手动点击立即打断。

### 开发
本项目不需要构建工具，直接编辑用户脚本文件即可。

### 许可
你可以按自己的需要选择许可证（MIT/Apache-2.0 等）。


