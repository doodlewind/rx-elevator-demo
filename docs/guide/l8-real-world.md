<script setup>
import { program } from '@/lessons/l8'

// 本课最重要的一张图：同一串「密集连点」，分别经过 debounceTime 与
// throttleTime 之后，输出完全不同。横轴是时间（帧）。
// 场景：一个着急的人在第 1、2、3 帧连按了三下 7 层，安静了一会儿，
// 又在第 8、9 帧补按了两下。
const spec = {
  streams: [
    {
      label: '原始点击',
      events: [
        { time: 1, value: '7' },
        { time: 2, value: '7' },
        { time: 3, value: '7' },
        { time: 8, value: '7' },
        { time: 9, value: '7' },
      ],
    },
    { label: 'debounceTime(2) ↓', isOperator: true, events: [] },
    {
      label: '事后才发',
      events: [
        // 第 3 帧是这一阵的最后一下，再静 2 帧 → 第 5 帧放行
        { time: 5, value: '7', color: '#21c0a8', tip: '安静 2 帧后，认这一阵' },
        // 第 9 帧是第二阵的最后一下，再静 2 帧 → 第 11 帧放行
        { time: 11, value: '7', color: '#21c0a8', tip: '第二阵安静后再认一次' },
      ],
    },
    { label: 'throttleTime(3) ↓', isOperator: true, events: [] },
    {
      label: '先发再冷却',
      events: [
        // 第 1 帧立刻放行，冷却 3 帧（1~3）
        { time: 1, value: '7', color: '#f6a609', tip: '先发：立刻认第一下' },
        // 第 8 帧（冷却早已结束）又立刻放行
        { time: 8, value: '7', color: '#f6a609', tip: '冷却结束后，再认一下' },
      ],
    },
  ],
  frames: 13,
}

const captions = {
  0: '一个着急的乘客准备连按 7 层。',
  1: '第 1 帧：第一下点击。throttle 立刻放行（先发），debounce 先按住不动。',
  2: '第 2 帧：又一下。debounce 的「安静计时」被重置；throttle 还在冷却，丢弃。',
  3: '第 3 帧：第三下。这是这一阵的最后一下，但 debounce 还要再等等看。',
  5: '第 5 帧：安静满 2 帧，debounce 终于放行这一阵 —— 三连点合并成 1 个值。',
  8: '第 8 帧：补按一下。throttle 冷却早结束，立刻放行；debounce 又开始按住。',
  9: '第 9 帧：再补一下，debounce 的安静计时再次被重置。',
  11: '第 11 帧：第二阵也安静了，debounce 放行第二个值。两条流，节奏完全不同。',
}
</script>

# L8 · 真实世界的细节

前面几课，我们假设乘客都很「乖」：按一下就是一次干净的请求。可现实里，人是会**手抖**的 —— 电梯没立刻来，他就「咚咚咚」把 7 层连按五六下；明明上行呼叫还没服务完，又忍不住再戳两下。

如果我们把每一次点击都老实地喂给调度器，会发生什么？

> 同一个目标楼层被反复加入、状态被无意义地刷新、日志里全是噪声。电梯没坏，但它在被**毛刺信号**带着空转。

这一课，我们就在「请求真正进入调度之前」加一道**预处理闸门**，把人的毛刺过滤干净。用到的，是一组全新的、和**时间**打交道的操作符。

## 一个关键区分：debounce 还是 throttle？

它们都能「把密集事件变稀疏」，但策略正好相反，初学者最容易混。先记住两句大白话：

<ConceptCard title="去抖 vs 节流：一句话记牢" icon="🛗">

- **debounceTime（去抖）= 事后才发**：每来一个事件就重新计时，**直到安静一段时间没有新事件，才放行最后那一个**。就像电梯门 —— 只要还有人探头进来，关门倒计时就重置，等真的没人了才关。适合「连点」「输入框搜索」这类「等用户停手再处理」的场景。
- **throttleTime（节流）= 先发再冷却**：**立刻放行第一个**，然后进入一段冷却期，**冷却期内的事件全部丢弃**，冷却结束后下一个再放行。适合「限流」「滚动/拖拽中每隔一段才采样一次」这类「要立刻响应、但别太频繁」的场景。

一句话：**debounce 等你停手，throttle 给你限速。**

</ConceptCard>

## 看得见：同一串连点，两种结果

这是本课最重要的一张图。上面是一个着急乘客对 7 层的**密集连点**；中间一条是它经过 `debounceTime` 的输出，下面一条是经过 `throttleTime` 的输出。点 ▶ 播放，或用 ⏭ 一帧帧拨，盯住两条输出流**何时**冒出值：

<MarblePlayer :spec="spec" :captions="captions" />

把两条输出对照着看，差异一目了然：

- **debounce（绿色，事后才发）**：连点的瞬间一个都不发，**憋到安静下来**，才把这一阵合并成一个值。所以它的值总是「迟到」一点，但每一阵连点只认一次 —— 正是我们想要的「合并连点」。
- **throttle（橙色，先发再冷却）**：**第一下就立刻发**，之后冷却期内的连点全丢。响应快，但合并的是「冷却期内」的点击。

对电梯来说，「合并同一阵连点」用 **debounce** 最贴切：乘客手一停，我们就认一次他的真实意图。

## 代码：在请求进 reducer 之前装一道闸门

这一课沿用我们熟悉的**单电梯骨架**——「`merge` 把多条来源汇成一条流，`scan` 把流累积成状态」。新东西只有一处：在请求汇入之前，先过一遍预处理。

```ts
import { merge, timer, map, scan, debounceTime, distinctUntilChanged } from 'rxjs'
import { addTarget, advance, initialPlan, toState } from '@/domain/engine'

// ① 预处理：把「人的毛刺」过滤成「干净的请求」
const clean$ = requests$.pipe(
  // 同一阵密集点击，只在它「安静下来」后放行最后一个（防连点抖动）
  debounceTime(200),
  // 和上一个放行的请求「身份」相同，就不再重复加入目标（去重）
  distinctUntilChanged((a, b) => `${a.floor}:${a.direction}` === `${b.floor}:${b.direction}`),
)
```

逐句拆开：

- `debounceTime(200)`：流里每来一个请求，就重置一个 200ms 的计时器；**只有静默满 200ms**，最后那个请求才被放行。一阵「咚咚咚」于是被压成一个值。
- `distinctUntilChanged(...)`：再保一道险。我们给每个请求算一个「身份」字符串 `楼层:方向`，**如果和上一个放行的身份相同就跳过** —— 防止同一个还没服务完的呼叫被重复塞进目标。

干净的请求拿到手，后面就是老朋友 `merge` + `scan` 了：

```ts
// ② 时间节拍：每 tickMs 推进电梯一帧
const tick$ = timer(tickMs, tickMs).pipe(map(() => ({ type: 'tick' as const })))

// ③ merge：把「干净请求」和「时间节拍」汇成一条流
const events$ = merge(
  clean$.pipe(map((req) => ({ type: 'request' as const, req }))),
  tick$,
)

// ④ scan：用纯函数 reducer 累积出电梯状态
events$.pipe(
  scan((acc, ev) =>
    ev.type === 'request'
      ? { plan: addTarget(acc.plan, ev.req.floor), arrived: false } // 新目标
      : /* tick */ stepOneFrame(acc),                                // 推进一帧
    { plan: initialPlan(), arrived: false },
  ),
  map(({ plan, arrived }) => [toState(plan, { doorsOpen: arrived })]), // 投影成 UI 状态
)
```

注意：**调度逻辑我们没有自己写**，而是直接调用 `domain/engine.ts` 里的纯函数 `addTarget`、`advance`、`toState`。RxJS 只负责「**随时间编排**」——什么时候加目标、什么时候推进一帧；具体「该往哪走」交给久经考验的 LOOK 算法。各司其职，代码才清爽。

> 想给开关门加点真实的「过渡时序」？可以用 `delay` 把门状态流整体往后推一点点，让「开门」不是瞬间完成。本课从简，先把防抖讲透。

## 动手：感受「防抖」让交互变稳

下面是把这段 `program` 真的跑起来的电梯。**故意快速连点同一个楼层按钮**好几下，再看右侧日志：你会发现电梯**不会**被你的连点带乱 —— 多余的点击在进门之前就被 `debounceTime` 合并、被 `distinctUntilChanged` 去重了。

<ElevatorRunner :program="program" :floors="8" :showLog="true" />

试着对比想象一下：如果没有这道闸门，每一下连点都会触发一次状态刷新、日志刷屏。加上它之后，**界面更稳、调度更干净** —— 这正是真实产品里无处不在的细节。

<ConceptCard title="本课小结" icon="✅">

- **时间类操作符**专门处理「事件的疏密节奏」，是把现实噪声挡在业务逻辑之外的第一道闸门。
- `debounceTime`：**事后才发** —— 等流安静下来，只认最后一个。最适合「合并连点」。
- `throttleTime`：**先发再冷却** —— 立刻响应一次，再限速。适合「限流/采样」。
- `distinctUntilChanged`：和上一个放行的值相同就跳过，给去重再上一道保险。
- 模式复用：**预处理 → `merge` → `scan`**，把「清洗输入」和「编排状态」清晰地分层。

</ConceptCard>

➡️ 下一课：[L9 · 完整模拟器](/guide/l9-full-sim)
