<script setup>
import { program } from '@/lessons/l5'

// 上面：merge 之后的「事件流」—— add 事件（按钮，绿色）和 tick 事件（时钟，灰色）
// 交织在同一条时间轴上。下面：scan 累积出的「待办楼层集合」随时间的变化。
const spec = {
  streams: [
    { label: '事件流（merge 后）', events: [
      { time: 0, value: 'tick', color: '#9aa4b2', tip: '时钟滴答' },
      { time: 1, value: '+4', color: '#21c0a8', tip: '按了 4 层' },
      { time: 2, value: 'tick', color: '#9aa4b2' },
      { time: 3, value: '+6', color: '#21c0a8', tip: '按了 6 层' },
      { time: 4, value: 'tick', color: '#9aa4b2' },
      { time: 5, value: 'tick', color: '#9aa4b2' },
      { time: 6, value: 'tick', color: '#9aa4b2' },
      { time: 7, value: 'tick', color: '#9aa4b2' },
      { time: 8, value: 'tick', color: '#9aa4b2' },
    ] },
    { label: 'scan ↓（累积）', isOperator: true, events: [] },
    { label: '待办集合 targets', events: [
      { time: 0, value: '{}', color: '#c7cdd6' },
      { time: 1, value: '{4}', color: '#5b8def' },
      { time: 2, value: '{4}', color: '#5b8def' },
      { time: 3, value: '{4,6}', color: '#5b8def' },
      { time: 4, value: '{4,6}', color: '#5b8def' },
      { time: 5, value: '{4,6}', color: '#5b8def' },
      { time: 6, value: '{6}', color: '#5b8def' },
      { time: 7, value: '{6}', color: '#5b8def' },
      { time: 8, value: '{}', color: '#c7cdd6' },
    ] },
  ],
  frames: 10,
}

const captions = {
  0: '开局：电梯停在 1 层，待办集合是空的 {}。时钟在「空转」滴答。',
  1: '第 1 帧：有人按了 4 层。这是个 add 事件 → scan 把 4 并进集合，targets = {4}。',
  2: '第 2 帧：一个 tick → 电梯朝目标挪一层，到了 2 层。待办集合没变，还是 {4}。',
  3: '第 3 帧：上行途中又有人按了 6 层！add 事件让集合「长大」→ targets = {4,6}。这正是「累积」。',
  4: '又一个 tick：电梯继续上行到 3 层。两个目标都还排着队。',
  5: '再一个 tick：到 4 层。',
  6: '到站！scan 调用 advance，把 4 从集合里摘掉 → targets = {6}，电梯继续往上。',
  7: 'tick：上行到 5 层，奔向剩下的目标 6。',
  8: '到 6 层、摘掉最后一个目标 → 集合清空回到 {}。一趟把两次点击都服务完了。',
}
</script>

# L5 · 排队：累积请求

到上一课为止，我们的电梯有个尴尬的毛病：**它一次只惦记一个目标**。你按了 7 层，它去 7 层；半路你又按 3 层，前一个目标就被「冲掉」了。可现实里的电梯明明会把你按过的每一层都记下来，攒成一串待办，再一趟趟服务。

这一课就是质变：让电梯学会**把多次点击累积成一个「待办楼层集合」**。

## 先看清「累积」是怎么一回事

想象电梯门口贴着一张小本本。每次有人按楼层，就往本本上记一笔；电梯每走一步，就照着本本决定往哪挪、到站了就划掉一笔。这张「**会随时间不断被改写的本本**」，就是我们要的状态。

把「一串陆续到来的事件」滚成「一份不断更新的状态」—— RxJS 里干这活儿的操作符，叫 `scan`。

<ConceptCard title="scan：reduce 的「每一步都发出来」版本" icon="🛗">

你一定用过数组的 `reduce`：给它一个初始值和一个「累加函数」，它从左到右把整个数组**压成一个最终结果**。

`scan` 几乎一模一样 —— 同样是初始值 + 累加函数（我们叫它 **reducer**）—— 唯一的区别是：

> 它不只在最后吐一个结果，而是**每吃进一个值，就把当前的中间结果发出来一次**。

`[1,2,3].reduce(+)` 只给你 `6`；而 `scan` 会依次发出 `1 → 3 → 6`。正是这一串「中间状态」，让我们能看着待办集合**随时间一点点长大、又一点点变小**。

</ConceptCard>

## 两条流，先合成一条

待办集合什么时候会变？两种时机：

- **有人按按钮** —— 该往本本上「加一个目标」；
- **时间过去了一帧** —— 该让电梯「挪一步 / 到站划掉」。

这是两条不同的流：一条来自用户（点击），一条来自时钟（节拍）。我们用 `merge` 把它们**汇成一条事件流**，再统一喂给 `scan`：

```ts
// 时钟流：每过 msPerFloor 毫秒发一个 tick 事件
const clock$ = timer(0, ctx.building.msPerFloor).pipe(
  map(() => ({ kind: 'tick' as const })),
)
// 点击流：把每个请求翻译成一个 add 事件
const adds$ = requests$.pipe(
  map((req) => ({ kind: 'add' as const, floor: req.floor })),
)
// merge：谁先到谁先发，两条流交织进同一条时间轴
merge(adds$, clock$)
```

`merge` 的脾气很简单：**它不打乱、不等待，把几条流的值原封不动地汇到一起**，谁先发就先出现在合流里。于是下游只面对「一条事件流」，里面有 `add`、也有 `tick`。

## 看得见：事件流 → scan → 待办集合

下面这张弹珠图，上面是 `merge` 之后的事件流（绿色是按钮 `add`，灰色是时钟 `tick`），下面是 `scan` 累积出的待办集合 `targets`。点 ▶ 播放，或用 ⏭ 一帧帧拨，盯着集合怎么「长大、清空」：

<MarblePlayer :spec="spec" :captions="captions" />

关键的两帧：

- **第 3 帧**，电梯正上行途中，又来一个 `+6`：集合从 `{4}` **长成** `{4,6}` —— 这就是「累积」，新请求不会冲掉旧请求。
- **第 6 帧**，电梯到达 4 层：`scan` 不是收到 `add`、而是收到 `tick`，于是它**划掉** 4，集合缩成 `{6}`，电梯接着奔向 6。

同一个 `scan`，同一个 reducer，靠事件的 `kind` 决定是「加」还是「走」。

## 代码：一个 scan 串起全部

这一课的核心就这么几行（调度细节交给 `engine.ts` 的纯函数，我们只管编排）：

```ts
import { merge, timer, map, scan, distinctUntilChanged } from 'rxjs'
import { addTarget, advance, initialPlan, toState } from '@/domain/engine'
import { sameState } from '@/domain/types'

return merge(adds$, clock$).pipe(
  scan(
    // reducer：吃进「当前计划 + 一个事件」，吐出「新的计划」
    (plan, ev) =>
      ev.kind === 'add'
        ? addTarget(plan, ev.floor) // 按钮：把目标并进集合（去重、排序）
        : advance(plan),            // 时钟：朝目标挪一层 / 到站摘掉目标
    initialPlan(ctx.building),       // 初始值：1 层、idle、待办为空
  ),
  // 把内部计划投影成 UI 状态
  map((plan) => [toState(plan, { doorsOpen: false })]),
  // 相邻两帧若「看起来一样」（电梯停着连发好几个 tick），就不重复发
  distinctUntilChanged((a, b) => sameState(a[0], b[0])),
)
```

逐句拆开：

- `scan(reducer, initialPlan(...))`：初始值是一份空计划，reducer 每收到一个事件就更新它一次，并把更新后的计划发出去。
- reducer 内部那个三元表达式，就是整课的灵魂：**`add` 走 `addTarget`，`tick` 走 `advance`**。这两个都是 `engine.ts` 里的**纯函数 reducer 内核** —— 给定旧计划，算出新计划，不碰外部、不留副作用。`scan` 负责「把它们沿时间串起来」。
- `advance` 内部实现的是经典的 LOOK 电梯算法（顺路一路扫、扫完再掉头），我们这一课不必关心它怎么算 —— 下一课会专门拆它。
- `distinctUntilChanged(sameState)`：电梯停着时时钟还在滴答，会产出一串「完全相同」的帧；这个操作符把重复帧滤掉，**只在状态真的变化时才发**。

注意整段代码里**没有一个会被改写的变量**：待办集合不是某个数组被 `push`，而是 `scan` 一帧帧「生」出来的新值。状态的演化，全写在数据流里。

## 动手：连点几个楼层试试

下面把这段 `program` 真的跑起来。**快速连按好几个楼层按钮**（比如先按 6、再按 3、再按 8），看电梯怎么把它们都收进待办、再顺路一趟趟服务，而不是只认最后一个：

<ElevatorRunner :program="program" :floors="8" :showLog="true" />

试着观察：上行途中按一个更高的楼层，它会顺路捎上；按一个已经路过的楼层，它会等掉头那趟再回来 —— 这些「顺不顺路」的智慧，都藏在 `advance` 里，是下一课的主角。

<ConceptCard title="本课小结" icon="✅">

- `scan` = 数组 `reduce` 的「每步都发出来」版本：把**一串事件**累积成**一个不断演化的状态**。
- `merge` 把「用户点击流」和「时钟滴答流」**汇成一条事件流**，下游只面对一条流。
- reducer 用事件的 `kind` 分流：`add` → `addTarget`（记下目标），`tick` → `advance`（挪一步 / 到站划掉）。
- 真正的状态变化逻辑是 `engine.ts` 里的**纯函数**；`scan` 只负责把它们沿时间串起来。
- `distinctUntilChanged(sameState)` 滤掉「没变化」的重复帧。

</ConceptCard>

➡️ 下一课：[L6 · SCAN 调度算法](/guide/l6-scan-algorithm)
