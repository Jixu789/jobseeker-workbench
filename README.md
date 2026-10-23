# 求职作战室 · Jobseeker Workbench

一个离线可用的求职工作台：把「岗位 JD + 个人简历」变成一份有针对性的简历、一场能练的模拟面试，以及一组真正加分的反问。

## 在线访问

- 工作台：<https://jixu789.github.io/jobseeker-workbench/>
- 产品说明与验证报告：<https://jixu789.github.io/jobseeker-workbench/report.html>

## 它解决什么

| 断点 | 对应动作 |
| --- | --- |
| 不知道差在哪 | JD 结构化解析 + 加权覆盖率打分 + ATS 六项体检 |
| 知道要改但改不动 | 逐条改写建议，只重组已有事实，新增量化标「待补证据」 |
| 没有低成本练习 | 8 阶段面试状态机：出题、追问、即时点评、四维评分 |
| 反问环节浪费机会 | 六组反问生成 + 五条「别这样问」 |

## 使用

直接用浏览器打开 `index.html` 即可，无需构建、无需后端；数据只存在本机 `localStorage`（key `jobseeker-workbench-v1`）。

- 岗位雷达可批量导入公告类岗位，导入后自动进入「补 JD」向导：先试一次直连抓原文，失败则手动粘贴，本地拆分「岗位职责 / 任职要求」两栏。
- 配置 OpenAI 兼容 API 后，简历的工作经历 / 项目经历改由模型按原文抽取；未配置时按本地规则拆分。

## 仓库说明

- `index.html`：工作台（单文件）
- `report.html`：产品说明与验证报告（ECharts / Mermaid 已本地化到 `_shared/`）
- `.nojekyll`：GitHub Pages 走纯静态托管，避免 Jekyll 忽略 `_shared` 这类下划线目录
