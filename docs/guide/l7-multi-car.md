<script setup>
import { program } from '@/lessons/l7'

// 场景：一栋楼有两部电梯，#1 停在 1 层、#2 停在 7 层。
// 现在 4 层有人按了呼叫 —— 谁去？我们用弹珠图把「派单」这一刻画出来。
const spec = {
  streams: [
    { label: '大厅呼叫', events: [
      { time: 2, value: '4F', tip: '4 层有人按了呼叫' },
    ] },
    { label: 'pickCar ↓ 派单', isOperator: true, events: [] },
    { label: '#1（在 1 层）', events: [
      { time: 0, value: '1', color: '#94a3b8' },
      { time: 2, value: '→4', color: '#21c0a8', tip: '距离 3 层，被选中' },
      { time: 3, value: '2', color: '#21c0a8' },
      { time: 4, value: '3', color: '#21c0a8' },
      { time: 5, value: '4', color: '#21c0a8', tip: '到站开门' },
    ] },
    { label: '#2（在 7 层）', events: [
      { time: 0, value: '7', color: '#94a3b8' },
      { time: 2, value: '7', color: '#94a3b8', tip: '距离 3 层但要掉头，没被选中' },
    ] },
  ],
  frames: 8,
}

const captions = {
  0: '两部电梯：#1 静止在 1 层，#2 静止在 7 层。整栋楼的状态是一个长度为 2 的数组。',
  2: '第 2 帧：4 层有人呼叫。这一个请求要派给某一部电梯 —— pickCar 登场。',
  3: '#1 距 4 层是 3 层，#2 距 4 层也是 3 层，打平；但 #1 顺路（idle 可直接上行），于是 4 层派给了 #1。',
  4: '此后每个 tick，被选中的 #1 一层层往上挪：2 → 3 → …，#2 原地不动。',
  5: '#1 抵达 4 层，开门。整个过程里，#2 的状态从未被这次请求碰过。',
}
</script>

# L7 · 多部电梯协同

到上一课为止，我们手里始终只有**一部**电梯。可现实里的大楼往往有三五部电梯并排。这一课，我们把楼里的电梯增加到 3 部，于是冒出一个全新的问题：

> 4 层有人按了呼叫按钮 —— **该派哪一部电梯去？**

这就是真实电梯系统每天在做的事，业内叫「派单」（dispatching）。它会把我们前面学的「流」推进到一个更有意思的形态。

## 一份状态，变成一排状态

回想一下：单电梯时，我们用 `scan` 维护**一份**累加器（一个 `CarPlan`）。多电梯只是把这份累加器从「一个」变成「一排」：

```ts
plans: CarPlan[]   // 整栋楼里所有电梯，此刻的计划
```

请求流还是同一条，但每来一个请求，我们要先决定**把它塞进数组里的哪一格**，再让时间的节拍推动**每一格**各自前进。

<ConceptCard title="派单：一条请求流，派发到多条子状态" icon="🛗">

多电梯的本质，是两个动作的合体：

- **派发（fan-out）**：一条「请求流」进来，按某种规则挑出最合适的那部电梯，只更新它；
- **合并（fan-in）**：每部电梯各自的状态，最终又要汇成**一条**「状态流」交给界面去画。

我们用一个现成的纯函数 `pickCar(plans, floor)` 来做派发的决策：它会在所有电梯里挑「**最近且最顺路**」的那一部，返回它的下标。

</ConceptCard>

## 看得见：同一个 4 层呼叫，为什么派给了它

下面这张弹珠图里，4 层呼叫只发生了一次，但两部电梯的「命运」却不同。点 ▶ 播放，或用 ⏭ 单步，看 `pickCar` 在第 2 帧如何拍板：

<MarblePlayer :spec="spec" :captions="captions" />

关键就在第 3 帧的解说：两部电梯**距离打平**，但 #1 是 `idle`（可以马上顺着上行），而 #2 在 7 层、要为这趟掉头，于是 `pickCar` 把单子派给了 #1。**离得近不一定赢，顺路才是关键** —— 这正是真实调度里「捎带」的味道。

## 代码：merge 合流 + scan 累加 + map 投影

这一课的管道，和你已经熟悉的「`merge` 两条流 → `scan` 维护状态」一脉相承，只是累加器从一个变成了一排。先看最核心的几行：

```ts
import { merge, timer, scan, map } from 'rxjs'
import { addTarget, advance, pickCar, type CarPlan } from '@/domain/engine'

// 整栋楼的初始状态：cars 部电梯，起始楼层错开。
const initial: CarPlan[] = Array.from({ length: cars }, (_, i) => ({
  floor: 1 + i * 2, direction: 'idle' as const, targets: [],
}))

// 时间节拍 + 用户请求，合成同一条事件流。
const ticks$ = timer(msPerFloor, msPerFloor).pipe(map(() => ({ kind: 'tick' })))
const adds$  = requests$.pipe(map((req) => ({ kind: 'add', floor: req.floor })))

return merge(ticks$, adds$).pipe(
  scan((plans, event) => {
    if (event.kind === 'add') {
      // 派单：挑一部最合适的，只更新它，其余原样保留。
      const chosen = pickCar(plans, event.floor)
      return plans.map((p, i) => (i === chosen ? addTarget(p, event.floor) : p))
    }
    // tick：所有电梯各自推进一帧。
    return plans.map((p) => advance(p))
  }, initial),
  map((plans) => plans.map((p, i) => /* …投影成带 carId 的 ElevatorState… */)),
)
```

逐句拆开：

- `Array.from({ length: cars }, ...)` 一次性造好「一排」初始计划，每部起始楼层错开两层，画面更像真实大楼。
- `merge(ticks$, adds$)`：两条流汇成一条 —— **节拍**和**请求**谁先来就先处理谁。这是 L6 学过的「合流」。
- `scan(reducer, initial)`：`plans` 是整栋楼上一刻的状态，`event` 是这一刻发生的事。这是唯一一处「记忆」。
- 处理 `add` 时，`pickCar` 返回**一个下标**，我们用 `plans.map(... i === chosen ? ...)` 实现「**只动被选中的那一部**」。这就是「派发」。
- 处理 `tick` 时，`plans.map((p) => advance(p))` 让**每一部**电梯各自前进一帧。
- 最后的 `map` 把整排内部计划投影成 `ElevatorState[]`，给每部贴上 `carId`（`'#1'`、`'#2'`…），界面就能把它们并排画出来。这是「合并」回一条流。

整条管道里**没有一个 `if` 散落在外面**，所有分支都收进 reducer 的「一个事件 → 一份新状态」里 —— 这就是响应式调度的干净之处。

## 顺便认识一对工具：groupBy 与 partition

我们这里是在 reducer 里**手动**用 `pickCar` 派单，最直观。但 RxJS 其实自带了把「一条流按 key 拆成多条子流」的能力：

- `partition(源流, 判断函数)` —— 按「真/假」把一条流劈成**两条**；
- `groupBy(取 key 函数)` —— 按 key 把一条流分成**任意多条**子流，每条子流可以单独 `pipe` 处理。

如果让每部电梯各拥有一条独立的子流，`groupBy` 会是顺手的工具。本课不展开 —— 对初学者来说，「在 reducer 里挑一部更新」比「管理一堆动态子流」更容易在脑子里跑通。先记住它们存在，需要时再回来查。

## 动手：3 部电梯，12 层楼

下面是把这段 `program` 真的跑起来的三电梯大楼。多按几个不同楼层的呼叫，留意**每次呼叫被派给了哪一部**，再想想 `pickCar` 为什么这么选：

<ElevatorRunner :program="program" :cars="3" :floors="12" :showLog="true" />

试试这些情景，体会「最近且顺路」：

- 三部电梯都静止时，按一个楼层 —— 通常派给**离得最近**的那部。
- 让 #1 正在上行，再在它**前方上面**按呼叫 —— 它会顺路捎带，而不是惊动远处闲着的电梯。
- 在一部正在上行的电梯**身后**按呼叫 —— 系统宁可派另一部，也不让它掉头。

<ConceptCard title="本课小结" icon="✅">

- 多电梯，就是把累加器从一个 `CarPlan` 升级成一排 `CarPlan[]`；管道形状（`merge → scan → map`）原封不动。
- **派发（fan-out）**：一条请求流进来，用 `pickCar` 挑出最合适的电梯，**只更新它**。
- **合并（fan-in）**：`map` 把整排内部计划投影成 `ElevatorState[]`，带上 `carId`，汇成一条流交给界面。
- `pickCar` 的偏好是「**最近且顺路**」—— 距离打平时，顺路的赢。
- 进阶：`groupBy` / `partition` 能把一条流按 key 拆成多条子流；本课为了直观，改用 reducer 内手动派单。

</ConceptCard>

➡️ 下一课：[L8 · 真实世界的细节](/guide/l8-real-world)
