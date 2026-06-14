<script setup>
import { program } from '@/lessons/l9'

// 一张「集大成」弹珠图：上面两条输入流（按钮请求 + 时钟），
// merge 成一条事件流，scan 累积出每一刻的电梯状态。
const spec = {
  streams: [
    { label: '按钮请求', events: [
      { time: 1, value: '5', color: '#f59e0b' },
      { time: 3, value: '8', color: '#f59e0b' },
      { time: 6, value: '2', color: '#f59e0b' },
    ] },
    { label: '时钟 tick', events: [
      { time: 0, value: '·' }, { time: 1, value: '·' }, { time: 2, value: '·' },
      { time: 3, value: '·' }, { time: 4, value: '·' }, { time: 5, value: '·' },
      { time: 6, value: '·' }, { time: 7, value: '·' }, { time: 8, value: '·' },
    ] },
    { label: 'merge → scan ↓', isOperator: true, events: [] },
    { label: '电梯状态', events: [
      { time: 0, value: '1', color: '#21c0a8' },
      { time: 1, value: '1', color: '#21c0a8' },
      { time: 2, value: '2', color: '#21c0a8' },
      { time: 3, value: '3', color: '#21c0a8' },
      { time: 4, value: '4', color: '#21c0a8' },
      { time: 5, value: '5', color: '#0ea5e9', tip: '到 5 层，开门停留' },
      { time: 6, value: '5', color: '#0ea5e9' },
      { time: 7, value: '6', color: '#21c0a8' },
      { time: 8, value: '7', color: '#21c0a8' },
    ] },
  ],
  frames: 10,
}

const captions = {
  0: '世界初始化：电梯停在 1 层。时钟流每一拍 tick 一下，但还没有任务，所以原地不动。',
  1: '第 1 帧：有人按了 5 层。这个请求被 merge 进事件流，scan 里 pickCar 选中电梯、把 5 并入它的目标。',
  2: '又一个 tick。reducer 跑 advance：电梯朝目标走一层 → 到了 2 层。',
  3: '第 3 帧来了个 8 层请求（先记下），同一拍 tick 让电梯继续上行到 3 层。',
  4: '继续上行，4 层。注意：请求和 tick 是「两类事件」，但都流过同一个 scan。',
  5: '到达 5 层 —— advance 摘掉这个目标，dwell 开始倒计时，门开着停留。',
  6: '停留中：这一拍只把开门倒计时减一，电梯不动（第 6 帧的 2 层请求也被顺手记下）。',
  7: '门关，继续奔向下一个目标 8 层，路过 6 层。',
  8: '一路 7、8……每个值都是 scan 累积出来的「这一刻的完整世界」的投影。',
}
</script>

# L9 · 完整模拟器

恭喜你走到这里。前面八课，我们像搭积木一样，一块一块把电梯造了出来。这一课不学新东西 —— 我们要做的，是**把这些积木拼成一台真正能玩的电梯系统**：3 部电梯、12 层、大厅呼叫和轿厢按钮都能用，请求还会先被「清洗」一遍再派单。

## 先回顾这一路：从一个 `map` 到一整套调度器

把前八课的关键词串起来，你会发现完整的电梯其实早就藏在你手里了：

- **L1 · `map`** —— 流是「随时间到来的一串值」；`map` 把每个值变成另一个值。
- **L2 · `timer`** —— 用一条节拍流，让电梯随时间一层层地动起来。
- **L3 / L4 · 高阶 & `merge`** —— `switchMap` 把一个请求展开成一段子流；`merge` 把多条流并成一条。
- **L5 · `scan`** —— 像 `reduce` 一样累积状态，让流「记得住」此刻的全部计划。
- **L6 · LOOK + 开门停留** —— 电梯顺路扫楼、到站停一会儿再走。
- **L7 · 多电梯派单** —— 来了呼叫，挑一部最顺路的去接。
- **L8 · 去抖 / 去重** —— 把用户的狂点和重复请求洗干净再处理。

这一课就是把它们**合流到一个 `program` 里**。

<ConceptCard title="集大成：一条 merge，一个 scan" icon="🛗">

复杂系统不一定要复杂的结构。我们把整个世界拆成**两类事件**，再用最朴素的方式拼起来：

```
merge( 用户请求流 , 时钟节拍流 ).pipe( scan(reducer, 初始世界) )
```

- **请求事件**：有人按了按钮（先去抖、去重再进来）。
- **时钟事件**：`timer` 每隔一拍滴答一下，催电梯「走一层」。

两条流 `merge` 成一条，所有事件排着队流过同一个 `scan`。`scan` 里的 **reducer 是个纯函数**：吃「当前世界 + 一个事件」，吐「下一刻的世界」。整套调度，就是这一个累积。

</ConceptCard>

## 看得见：两条输入，一个 scan，攒出整段历史

下面这张弹珠图，把「两类事件 → 合并 → 累积 → 状态」一次画全。点 ▶ 播放，或用 ⏭ 逐帧拨，看上面的**请求**和**时钟**如何汇进同一个 `scan`，攒出下面那条**电梯状态流**：

<MarblePlayer :spec="spec" :captions="captions" />

注意那个蓝色的弹珠：电梯到了 5 层后**停了一拍才继续**走 —— 这就是 L6 的开门停留，在 reducer 里只是一句「倒计时不为 0 就别动」。

## 代码：reducer 是整台电梯的心脏

完整代码在 `src/lessons/l9.ts`，结构清晰、注释到位。这里只摘最关键的几段。

**第一步，把两类事件包装成统一类型再 `merge`：**

```ts
// 请求事件：先承接 L8 清洗一遍
const cleaned$ = requests$.pipe(
  debounceTime(120),                       // 狂点只留最后一下
  distinctUntilChanged((a, b) =>           // 连续重复的请求只算一次
    a.floor === b.floor && a.direction === b.direction && a.source === b.source),
)
const reqEvents$  = cleaned$.pipe(map((req) => ({ kind: 'req', req })))
const tickEvents$ = timer(0, msPerFloor).pipe(map(() => ({ kind: 'tick' })))

merge(reqEvents$, tickEvents$)             // 两条流并成一条
```

**第二步，`scan` 里的 reducer —— 整段调度逻辑就这么点：**

```ts
scan((world, ev) => {
  if (ev.kind === 'req') {
    // 来了请求：pickCar 选最顺路的电梯，把目标楼层并进去
    const i = pickCar(world.plans, ev.req.floor)
    const plans = world.plans.map((p, idx) =>
      idx === i ? addTarget(p, ev.req.floor) : p)
    return { ...world, plans }
  }
  // 时钟一拍：每部电梯各推进一帧
  const plans = [...world.plans], dwell = [...world.dwell]
  for (let i = 0; i < plans.length; i++) {
    if (dwell[i] > 0) { dwell[i]--; continue }   // 门开着停留中：不动
    const before = plans[i]
    const after = advance(before)                // engine 的纯函数推进一帧
    plans[i] = after
    if (after.targets.length < before.targets.length) dwell[i] = dwellTicks // 到站：开门
  }
  return { plans, dwell }
}, initialWorld)
```

逐句体会：

- 我们**没有手写任何调度细节**。`pickCar`、`addTarget`、`advance` 全是 `engine.ts` 里久经验证的纯函数 —— RxJS 只负责「在时间上把它们编排起来」。
- reducer 完全是纯函数：没有 `setTimeout`、没有全局可变量。「下一刻」只由「当前世界 + 这个事件」决定，所以可预测、可回放、可测试。
- 最后再 `map` 一下，把内部的 `World`（`CarPlan[]` + 各自的开门倒计时）投影成 UI 要的 `ElevatorState[]`。

这就是响应式的威力：**把「随时间变化」收进一个 `scan`，剩下的都是纯函数。**

## 动手：尽情玩你的毕业作品

下面是一台完整的 3 部电梯、12 层的电梯。按各楼层的 ▲ / ▼ 大厅呼叫，或进轿厢按数字键 —— 看派单、看 LOOK 顺路扫楼、看到站开门、看多部电梯协同：

<ElevatorRunner :program="program" :cars="3" :floors="12" :showLog="true" />

试试这些玩法，体会前八课如何在这里同时生效：

- 在 **10 层按 ▼、同时在 2 层按 ▲**：看系统把两个呼叫派给不同的电梯。
- 进一部电梯**连点同一个楼层好几下**：`debounceTime` + `distinctUntilChanged` 让它只算一次。
- 让一部电梯上行途中，**在它前方的楼层再发一个同向呼叫**：看它顺路捎带（LOOK），而不是掉头。

## 接下来：去 Playground 改你自己的管道

这台电梯不是终点，而是你的起点。前往 **[Playground](/playground)**，那里的 `program` 完全开放 —— 把上面的管道复制过去，动手改改看：

- 把 `debounceTime(120)` 调大调小，感受输入「灵敏度」的变化；
- 换一套派单策略（改 `pickCar` 的成本函数），让电梯更「聪明」或更「偷懒」；
- 给 reducer 加一种新事件，比如「消防优先」或「VIP 直达」。

### 延伸阅读（点到为止，留给好奇心）

- **背压（backpressure）**：当事件来得比处理得快，怎么办？了解 `throttleTime`、`bufferTime`、`sampleTime` 这一族「取舍」操作符。
- **调度策略**：真实电梯群控远不止 LOOK —— 搜「elevator group control / destination dispatch」会打开新世界。
- **把流搬出页面**：用 `Web Worker` 或 `ServiceWorker` 跑调度，让 UI 永远不卡；或用 `WebSocket` 把多端的请求 `merge` 进同一条流。
- **测试**：RxJS 的 `TestScheduler` 能用弹珠字符串（就是本课那种 `--a--b--|`）给整套调度写断言。

<ConceptCard title="🎉 毕业" icon="🎉">

你已经把 RxJS 的核心心法走了一遍：

- **流** = 随时间到来的一串值；`map` 换值、`timer` 造节拍、`merge` 合流。
- **`scan`** 让流「记得住」状态：复杂系统 = 一条 merge + 一个纯函数 reducer。
- **去抖 / 去重** 把混乱的输入洗干净；**纯函数调度**（engine）让逻辑可预测、可测试。

从一个 `map`，到一整台 3 部电梯的群控系统 —— 你走完了全程。👏

🎉 **毕业快乐！** 接下来：[去 Playground 改你自己的管道](/playground) · [RxJS 速查表](/guide/cheatsheet)

</ConceptCard>
