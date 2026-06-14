<script setup>
import { program } from '@/lessons/l3'

// 用 L3 的「半路改主意」场景，对比 switchMap（正确）与「假想的 mergeMap」（错误）。
// 故事：第 1 帧按 7 层，电梯往上爬；第 4 帧改按 3 层。
// switchMap：旧任务被取消，电梯掉头去 3 层。
// mergeMap：旧任务没被取消，两条子流同时活着，电梯被「同时指挥」去两个地方，行为错乱。
const spec = {
  streams: [
    {
      label: '请求流',
      events: [
        { time: 1, value: '7', tip: '按 7 层' },
        { time: 4, value: '3', tip: '改主意：按 3 层' },
      ],
    },
    { label: '✅ switchMap', isOperator: true, events: [] },
    {
      label: '正确输出',
      events: [
        { time: 1, value: '1', color: '#21c0a8' },
        { time: 2, value: '2', color: '#21c0a8' },
        { time: 3, value: '3', color: '#21c0a8' },
        { time: 4, value: '4', color: '#f5a623', tip: '掉头' },
        { time: 5, value: '3', color: '#f5a623', tip: '到站开门' },
      ],
    },
    { label: '❌ mergeMap', isOperator: true, events: [] },
    {
      label: '去 7 层的子流（没被取消）',
      events: [
        { time: 1, value: '1', color: '#21c0a8' },
        { time: 2, value: '2', color: '#21c0a8' },
        { time: 3, value: '3', color: '#21c0a8' },
        { time: 4, value: '4', color: '#21c0a8' },
        { time: 5, value: '5', color: '#21c0a8', tip: '还在往 7 爬' },
        { time: 6, value: '6', color: '#21c0a8' },
        { time: 7, value: '7', color: '#21c0a8' },
      ],
    },
    {
      label: '去 3 层的子流（同时开始）',
      events: [
        { time: 4, value: '4', color: '#e0506e' },
        { time: 5, value: '3', color: '#e0506e', tip: '又想往 3 走' },
      ],
    },
    {
      label: '错乱输出',
      events: [
        { time: 4, value: '4/4', color: '#e0506e', tip: '两条流同时发声' },
        { time: 5, value: '5/3', color: '#e0506e', tip: '一会儿 5 一会儿 3，乱套' },
      ],
    },
  ],
  frames: 9,
}

const captions = {
  0: '电梯静止在 1 层。我们要对比同一个「半路改主意」场景下，switchMap 和 mergeMap 的天差地别。',
  1: '第 1 帧按了 7 层。两种写法都开出一条「去 7 层」的子流，电梯从 1 层起步。',
  3: '爬到 3 层，一切照旧。',
  4: '第 4 帧改按 3 层！switchMap 会取消旧子流、掉头去 3 层（绿/橙那行）；而 mergeMap 不取消任何东西，于是「去 7 层」和「去 3 层」两条子流同时活着。',
  5: '看下面两行红色：mergeMap 下，一条流喊「去 5、6、7」，另一条流喊「去 3」，最终输出在 5 和 3 之间反复横跳 —— 电梯被两个互相矛盾的指令同时驱动，彻底乱套。',
  7: '只有 switchMap 给出了符合直觉的结果：旧行程被丢弃，电梯老老实实停在 3 层。这就是「该用 switchMap 却用 mergeMap」的代价。',
}
</script>

# 常见误区与陷阱

学 RxJS 的过程里，几乎每个人都会踩到下面这几个坑。它们大多不是「语法错误」——代码能跑，但**行为不对**，或者**悄悄漏内存**。这一页把最常见的几个集中起来，每条都按「**现象 → 原因 → 正确做法**」来讲，遇到诡异问题时可以回来对照。

我们先用一个 `ConceptCard` 把**最致命的两个**钉在最前面：

<ConceptCard title="两个最容易要命的坑" icon="⚠️">

1. **忘记 `subscribe`**：Observable 是**惰性**的。不订阅，整条管道里的代码**一行都不会执行** —— 不是出错，而是「什么都没发生」，最让人摸不着头脑。
2. **该用 `switchMap` 却用了 `mergeMap`**：旧请求**没被取消**，旧任务和新任务同时活着，电梯被互相矛盾的指令同时驱动，行为彻底错乱。

记住这两条，能帮你绕开新手期至少一半的坑。

</ConceptCard>

## 坑 1 · 忘记 `subscribe`，整条流「装死」

**现象**：你写好了一整条 `pipe`，里面 `map`、`filter`、`tap` 一应俱全，运行起来却**毫无反应**，连一个 `console.log` 都不打。

**原因**：Observable 是**惰性（lazy）**的。你 `.pipe(...)` 出来的只是一张「**加工流程的图纸**」，描述了「值来了之后怎么处理」，但它**还没开工**。真正让流「通电、开始流动」的开关，是 `subscribe`。**没有订阅者，就没有值流动，管道里的代码一行都不会跑。**

```ts
import { interval, map } from 'rxjs'

const floors$ = interval(1000).pipe(
  map((n) => `电梯到了第 ${n + 1} 层`),
)

// ❌ 到此为止，控制台什么都不会打印 —— 因为没人订阅，流根本没开始流动
```

**正确做法**：给它一个订阅者，流才会真正开始发值。

```ts
// ✅ 一订阅，流就「通电」了，每秒打印一次
const sub = floors$.subscribe((msg) => console.log(msg))
```

> 一句话记住：**Observable 是「冷库里的图纸」，`subscribe` 才是「按下启动键」。** 在本教程里，`<ElevatorRunner>` 帮你在背后做了 `subscribe`，所以你写 `program` 时不用自己订阅；但脱离教程自己写代码时，这是第一个会忘的事。

## 坑 2 · 忘记 `unsubscribe`，内存泄漏 / 重复订阅

**现象**：页面用久了越来越卡；或者某段逻辑**触发了好几次**（按一下按钮，日志却打印了三遍）。

**原因**：`subscribe` 会建立一个**长期存在**的订阅。像 `interval`、`fromEvent`（监听 DOM 事件）这类流**永远不会自己结束**。如果你在组件里订阅了它，组件销毁时却没退订，这个订阅会**一直挂在那里**继续跑、继续占内存 —— 这就是泄漏。而如果组件反复创建（比如路由来回切换），每次都新订阅一遍却从不退订，就会**叠加出多个订阅**，于是「按一下、响三次」。

```ts
// ❌ 组件卸载后，这个订阅还活着，interval 仍在每秒触发 —— 泄漏
onMounted(() => {
  interval(1000).subscribe(() => doSomething())
})
```

**正确做法**：`subscribe` 返回一个 `Subscription`，在组件销毁时调用 `.unsubscribe()` 收回它。

```ts
import { interval } from 'rxjs'

let sub
onMounted(() => {
  sub = interval(1000).subscribe(() => doSomething())
})
onUnmounted(() => {
  sub?.unsubscribe() // ✅ 关掉水龙头，回收订阅
})
```

> 进阶写法是用 `takeUntil(destroy$)` 让流在某个信号到来时自动结束，从而免去手动退订。原理一样：**有订阅，就要有「关掉它」的时机。**

## 坑 3 · 该用 `switchMap` 却用了 `mergeMap`，电梯行为错乱

这是新手最容易写出「能跑但不对」的一个坑，值得用电梯场景好好看一眼。

**现象**：电梯正去 7 层，途中有人改按 3 层。你期望它**掉头去 3 层**，结果它却像被附体一样在两个目标之间反复横跳，或者先把 7 层跑完再回头。

**原因**：`switchMap` 和 `mergeMap` 都能「把一个请求展开成一条子流」，但对待**旧子流**的态度完全相反：

- `switchMap`：新请求一来，**立刻取消上一条还没跑完的子流**。任何时刻只有最新一条子流活着。
- `mergeMap`：新请求来了，**旧子流照样继续跑**，新旧子流**并行**存在、同时发值。

电梯一次只能在一个地方。当「去 7 层」和「去 3 层」两条子流**同时活着**、同时朝 UI 发「我在 5 层 / 我在 3 层」时，输出就会乱套。下面这张图把两者并排放在一起，重点盯第 **4** 帧之后两种操作符的分叉：

<MarblePlayer :spec="spec" :captions="captions" />

**正确做法**：凡是「**新请求应当作废旧请求**」的场景（改目标、最新搜索词、最新选中项……），用 `switchMap`。

```ts
import { switchMap, timer, map } from 'rxjs'

// ✅ 新请求一来就取消旧行程，电梯永远只追「最新的目标」
requests$.pipe(
  switchMap((req) => timer(0, tickMs).pipe(map((n) => moveTowards(req.floor, n)))),
)
```

> 反过来，`mergeMap` 也有它对的场合 —— 当**每个请求都该独立跑完、互不取消**时（比如「每个楼层的呼叫都要被记录」）。选哪个，取决于一句话：**旧的该不该被新的取消？** 该，就 `switchMap`；不该，才 `mergeMap`。

你可以在下面这部真电梯上亲手复现「坑 3 的正确版」：先点 7 层，趁它在路上时点一个更低的层，看它当场掉头 —— 这正是 `switchMap` 在替你取消旧订阅。

<ElevatorRunner :program="program" :floors="8" :showLog="true" />

## 坑 4 · 在 `subscribe` 回调里堆命令式逻辑

**现象**：`subscribe` 的回调函数越写越长，里面塞满了 `if`、`for`、临时变量、状态判断，最后变成一团谁也看不懂的「面条」。

**原因**：把「**数据该怎么变换**」的逻辑写进了 `subscribe` 里。`subscribe` 的本职是「**消费**最终结果」（更新界面、打日志），它**不该**承担加工数据的活儿。加工应该发生在**操作符管道**里。

```ts
// ❌ 逻辑全堆在 subscribe 里，无法复用、无法测试、读不懂
requests$.subscribe((req) => {
  if (req.source === 'hall' && req.floor > 0) {
    const target = req.floor
    // ……一大段计算、判断、赋值……
    updateUI(target)
  }
})
```

**正确做法**：把过滤、变换、累积等逻辑**搬进 `pipe`**，让每个操作符各管一件事；`subscribe` 只剩下「拿到结果，去渲染」。

```ts
import { filter, map } from 'rxjs'

// ✅ 逻辑在管道里分层清晰，subscribe 只负责消费
requests$
  .pipe(
    filter((req) => req.source === 'hall' && req.floor > 0),
    map((req) => req.floor),
  )
  .subscribe((target) => updateUI(target))
```

> 经验法则：**`subscribe` 回调里如果出现了 `if` / `for` / 中间变量，多半有逻辑「跑错了地方」，该往管道里挪。** 本教程从 L1 到 L9 几乎没在 `subscribe` 里写过逻辑，全交给了操作符，正是这个原则的体现。

## 坑 5 · 以为 `Subject` 能反复 `complete` 后再用

**现象**：你对一个 `Subject` 调用了 `.complete()`（或它因为出错而 `error` 了），之后再 `.next(值)`，发现**怎么推都没人收到**了。

**原因**：`Subject` 一旦 `complete` 或 `error`，就进入了**终止状态**，**再也不会发出任何值**。这是 Observable 的合约：`complete` / `error` 是「**一次性的终点**」，到了终点这条流就**永久关闭**，无法「重新打开」。

```ts
import { Subject } from 'rxjs'

const calls$ = new Subject()
calls$.subscribe((v) => console.log('收到', v))

calls$.next('7') // 收到 7
calls$.complete() // 宣布结束
calls$.next('3') // ❌ 石沉大海：complete 之后再 next 一律被忽略
```

**正确做法**：把 `complete` 当成「**这条流到此为止，以后别想再用**」。如果你需要的是「**一个长期存在、不断接收新请求**」的入口，那就**别去 complete 它**，让它一直开着即可。

```ts
// ✅ 大厅呼叫入口应当长期开放，全程都不要 complete
const calls$ = new Subject()
// 整个 App 生命周期里只管 next，绝不主动 complete
calls$.next('7')
calls$.next('3') // 正常收到
```

> 需要「重新来过」时，**新建一个 `Subject`**，而不是试图复活旧的。终点就是终点。

## 坑 6 · 分不清 cold 与 hot（点到为止）

最后一个不是「错」，而是一种容易反直觉的现象，先建立感觉即可。

- **Cold（冷）Observable**：每个订阅者都会触发一次**全新的、独立的**执行，像点播视频 —— 你点开它，**从头**为你单独播一遍。`interval`、`of`、`timer` 默认都是冷的。两个人订阅同一个冷流，各看各的，**互不影响**。
- **Hot（热）Observable**：值的产生**不依赖**订阅者，像直播 —— 你**几点进来就从几点开始看**，错过的就错过了。`Subject` 以及用 `share()` 包过的流是热的，**多个订阅者共享同一份**值。

**会踩到的地方**：你以为「订阅两次拿到的是同一份数据」，结果冷流给你跑了**两遍**（比如发了两次网络请求）；或者反过来，你以为热流会「从头补播」，结果它只给你**订阅之后**的值。

> 直觉口诀：**冷流 = 点播（每人从头看一遍）；热流 = 直播（进来才开始看）。** 想让多个订阅者共享一份冷流的结果，用 `share()` / `shareReplay()` 把它「转热」。更深入的机制（多播、连接、引用计数）建议作为延伸阅读，这里点到为止。

<ConceptCard title="本课小结" icon="✅">

- **没 `subscribe` 就什么都不会发生**：Observable 是惰性的图纸，订阅才通电。
- **有订阅就要有退订**：长生命周期的流要 `unsubscribe`（或 `takeUntil`），否则泄漏 / 重复触发。
- **旧请求该作废就用 `switchMap`，不该作废才用 `mergeMap`**：选错会让电梯被矛盾指令同时驱动。
- **逻辑放进管道，`subscribe` 只管消费**：回调里出现 `if`/`for` 就该警觉。
- **`Subject` 的 `complete` 是一次性终点**：终止后无法复用，需要重来就新建。
- **冷流点播、热流直播**：订阅次数与时机会改变你看到的值。

</ConceptCard>

➡️ 回到[教程首页](/guide/intro)，或翻翻 [RxJS 操作符速查表](/guide/cheatsheet) 巩固一下。
