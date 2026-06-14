# Rx 电梯学院

用一座电梯，由浅入深地帮你建立 **RxJS 的思维模型**。

这是一个交互式教程站点：与其干巴巴地背操作符，不如把「按钮按下」「电梯移动」「门开门关」「多梯派单」这些每天都会遇到的真实场景，一帧一帧地变成「随时间流动的值」。当你能用「流」的眼光看待电梯，你也就学会了用 RxJS 的眼光看待世界。

技术栈：**Vite + Vue 3 + VitePress + TypeScript + RxJS 7**。

## 特性

- **由浅入深的 9 课渐进课程**：从「一个按钮就是一条流」一路讲到「完整电梯模拟器」，每一课只引入一个新概念。
- **可播放的弹珠图（Marble Diagram）**：用 `<MarblePlayer>` 把「输入流 → 操作符 → 输出流」逐帧演示，配合逐帧解说，看清每个值在什么时间出现、被怎样变换。
- **可交互的电梯**：每一课的 RxJS 程序都能用 `<ElevatorRunner>` 真实跑起来——你亲手点楼层，电梯实时响应，所见即所学。
- **在线 Playground**：内置 CodeMirror 编辑器，随手改写 RxJS 代码并立即在电梯上看到效果，不用搭环境。

## 快速开始

需要 Node.js 18+。

```bash
# 安装依赖
npm install

# 启动本地开发服务器（vitepress dev docs）
npm run dev

# 构建静态站点
npm run build

# 本地预览构建产物
npm run preview

# TypeScript 严格模式类型检查
npm run typecheck
```

启动后在浏览器打开终端里给出的地址（默认 <http://localhost:5173>）即可开始学习。

## 目录结构

```
.
├── docs/                     # VitePress 站点与全部教程内容
│   ├── index.md              # 首页
│   ├── guide/                # 教程 Markdown（intro、L1..L9、附录速查表等）
│   ├── public/               # 静态资源
│   └── .vitepress/           # 站点配置与主题
│       ├── config.ts         # 导航、侧边栏、站点元信息
│       └── theme/            # 自定义主题，全局注册可视化组件
├── src/
│   ├── domain/               # 领域模型与纯函数引擎（共享契约，被各课 import）
│   │   ├── types.ts          # Direction / DoorState / ElevatorState 等类型
│   │   ├── runner.ts         # ElevatorProgram 约定：requests$ -> ElevatorState[]
│   │   ├── engine.ts         # 纯函数调度引擎（LOOK 算法、派单等）
│   │   └── marble.ts         # 弹珠图数据结构与 parseMarbles 解析器
│   ├── lessons/              # 每一课的 RxJS 程序
│   │   └── l1.ts ... l9.ts   # 各课 `export const program: ElevatorProgram`
│   └── components/           # 可视化组件（在主题中全局注册）
│       ├── MarbleDiagram.vue # 静态弹珠图
│       ├── MarblePlayer.vue  # 带播放 / 单步控制的弹珠图
│       ├── ElevatorShaft.vue # 单部电梯井的渲染
│       ├── ElevatorRunner.vue# 把某课 program 跑起来的可交互电梯
│       ├── Playground.vue    # 在线代码编辑 + 实时运行
│       └── ConceptCard.vue   # 概念高亮卡片
├── package.json
└── README.md
```

## 课程一览

| 课程 | 标题 | 一句话 |
| --- | --- | --- |
| L1 | 一个按钮，一条流 | 把「按下楼层按钮」看成随时间到达的值，认识 Observable。 |
| L2 | 让电梯动起来 | 用 `timer` / `interval` 产生时间，让电梯一层一层地移动。 |
| L3 | 一次只服务一个请求 | 用 `switchMap` 在新请求到来时切换，丢弃过时的旧任务。 |
| L4 | 上行还是下行 | 由当前楼层与目标推导方向，让状态随输入而变化。 |
| L5 | 排队：累积请求 | 用 `scan` 把零散请求累积成一个目标队列。 |
| L6 | SCAN 调度算法 | 把 reducer 当状态机，用 LOOK 算法决定下一步去哪。 |
| L7 | 多部电梯协同 | 多部电梯同时调度，按规则把请求派给最合适的那一部。 |
| L8 | 真实世界的细节 | 用 `debounceTime` / `distinctUntilChanged` 处理防抖、去重与时序。 |
| L9 | 完整模拟器 | 综合前八课，搭出一个可交互的完整电梯模拟器（毕业作品）。 |

## 致谢

本仓库是经典开源项目 [doodlewind/rx-elevator-demo](https://github.com/doodlewind/rx-elevator-demo) 的现代化翻新版：保留「用电梯讲 RxJS」的初心，并迁移到 Vite + Vue 3 + VitePress + TypeScript + RxJS 7 的现代技术栈，重写为一套可播放、可交互的渐进式教程。感谢原作者的灵感与开源精神。

## 协议

[MIT](./LICENSE) License。
