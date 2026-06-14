<script setup>
import { program } from '@/lessons/l3'

// 故事：第 1 帧有人按了 7 层，电梯从 1 层往上爬（1→2→3→4…）。
// 但在第 4 帧，又有人按了 3 层 —— switchMap 当场把「去 7 层」那条子流取消，
// 改追 3 层（电梯此刻在 4 层，于是往下走 4→3）。
const spec = {
  streams: [
    {
      label: '请求流',
      events: [
        { time: 1, value: '7', tip: '按 7 层' },
        { time: 4, value: '3', tip: '改主意：按 3 层' },
      ],
    },
    { label: 'switchMap ↓', isOperator: true, events: [] },
    {
      label: '去 7 层的子流',
      events: [
        { time: 1, value: '1', color: '#21c0a8' },
        { time: 2, value: '2', color: '#21c0a8' },
        { time: 3, value: '3', color: '#21c0a8' },
        // 第 4 帧新请求到来，这条子流被截断退订 —— 之后的爬升再也不会发生。
        { time: 4, value: '✕', color: '#9aa0a6', tip: '被取消（退订）' },
      ],
    },
    {
      label: '去 3 层的子流',
      events: [
        // 从电梯此刻真实位置 4 层接着走，往下到 3 层开门。
        { time: 4, value: '4', color: '#f5a623' },
        { time: 5, value: '3', color: '#f5a623', tip: '到站开门' },
      ],
    },
    {
      label: '最终输出',
      events: [
        { time: 1, value: '1', color: '#21c0a8' },
        { time: 2, value: '2', color: '#21c0a8' },
        { time: 3, value: '3', color: '#21c0a8' },
        { time: 4, value: '4', color: '#f5a623' },
        { time: 5, value: '3', color: '#f5a623' },
      ],
    },
  ],
  frames: 8,
}

const captions = {
  0: '电梯静止在 1 层，没有任务。',
  1: '第 1 帧：有人按了 7 层。switchMap 开出一条「去 7 层」的子流，电梯从 1 层起步。',
  2: '子流每过一拍往上挪一层：现在到 2 层。',
  3: '继续爬到 3 层 —— 一切照旧，正奔向 7 层。',
  4: '第 4 帧关键时刻：有人按了 3 层！switchMap 立刻把「去 7 层」的子流取消（那条灰色 ✕），电梯此刻在 4 层，于是掉头往下。',
  5: '新子流从 4 层接着走，到达 3 层开门。注意它没有从 1 层重新开始 —— current 记住了被打断时的真实位置。',
  6: '去 7 层的旅程被彻底丢弃了：最终输出里再也没有 5、6、7。一次只服务一个请求。',
}
</script>

# L3 · 一次只服务一个请求

上一课，我们用 `switchMap` 让电梯一层层地动了起来。这一课我们要揭穿 `switchMap` 真正的脾气：**它善变 —— 而且这恰恰是我们想要的。**

## 一个很现实的场景：半路改主意

想象电梯正在执行「去 7 层」的任务，已经爬到 4 层了。这时大厅里另一个人按了 **3 层**。电梯该怎么办？

直觉告诉我们：它应该**放弃**原来去 7 层的计划，转身去更近、更新的 3 层。也就是说 —— **旧任务必须被丢掉**。

神奇的是，上一课那行 `switchMap` 已经**天生**就是这么干的，我们只是上一课没点破。

<ConceptCard title="switchMap 的「切换」：新流一来，旧流当场作废" icon="🔀">

`switchMap` 全名里的 **switch（切换）** 才是它的灵魂：

> 每当外层流来一个**新值**，`switchMap` 会先**取消（退订）上一条还没跑完的内层子流**，再为新值开一条全新的子流。

所以任何时刻，**活着的内层子流永远只有一条 —— 最新的那条**。前一条哪怕跑到一半，也会被毫不留情地截断。这正是「一次只服务一个请求」。

</ConceptCard>

## 看得见：旧子流是怎么被「掐断」的

下面这张图有四行：上面是**请求流**，中间两行是 `switchMap` 为每个请求开出的**子流**，最下面是真正送给 UI 的**最终输出**。

请重点盯住第 **4** 帧 —— 新请求 `3` 到来的那一刻，「去 7 层」的子流被变灰、标上 ✕（表示被取消退订），它后面本该有的 5、6、7 永远不会出现了：

<MarblePlayer :spec="spec" :captions="captions" />

读懂这张图的关键，是把 `switchMap` 想成一只**只肯牵一条狗绳**的手：第二条狗（去 3 层的子流）一递过来，第一条狗（去 7 层的子流）的绳子就被立刻松开了。

## 代码：和上一课几乎一样，差别藏在两个变量里

这一课的 `program` 主体和 L2 长得几乎一模一样，魔法全在 `current` 这个闭包变量上：

```ts
let current = 1 // 记住电梯「此刻真实在哪一层」，每帧都会更新

return requests$.pipe(
  switchMap((req) => {
    const target = req.floor
    const from = current // ← 关键：从电梯当前真实位置出发，不是固定从 1 层
    const dir = target > from ? 'up' : target < from ? 'down' : 'idle'
    const step = dir === 'up' ? 1 : dir === 'down' ? -1 : 0

    return timer(0, tickMs).pipe(
      map((n) => {
        const floor = dir === 'idle' ? target : from + step * n
        current = floor // ← 每一帧写回真实位置
        const arrived = floor === target
        return [{ floor, direction: arrived ? 'idle' : dir,
                  doors: arrived ? 'open' : 'closed',
                  targets: arrived ? [] : [target] }]
      }),
      takeWhile((s) => s[0].floor !== target, true),
    )
  }),
)
```

逐句拆开最要紧的两行：

- `const from = current`：新请求不是从 1 层算起，而是从**电梯此刻真实在的那一层**算起。
- `current = floor`：每发一帧就把真实楼层记下来。这样万一这条子流被 `switchMap` 半路取消，`current` 也已经停在「被打断的那一层」，下一条子流就能从这里**无缝接着走**，而不会突然瞬移回 1 层。

换句话说：`switchMap` 负责「丢掉旧行程」，`current` 负责「记住电梯被丢下时停在哪」。两者配合，才有了顺滑的「半路改主意」。

## 动手：亲手打断它一次

下面是把这段 `program` 跑起来的真电梯。试试这个操作复现「中途改目标」：

1. 先点 **7 层**，让电梯开始往上爬；
2. 趁它还在路上（比如到了 3、4 层），赶紧点一个**更低的楼层，比如 2 层**；
3. 观察它会**当场掉头**，丢下去 7 层的任务，转去你新点的层。

<ElevatorRunner :program="program" :floors="8" :showLog="true" />

打开日志你会发现：去 7 层那趟根本没跑完，输出就被新目标接管了。这就是 `switchMap` 在替你「取消旧订阅」。

<ConceptCard title="本课小结" icon="✅">

- `switchMap` 的灵魂是 **switch（切换）**：外层来新值时，**先取消上一条内层子流，再开新的**。任何时刻只有最新一条子流活着。
- 这天然实现了「一次只服务一个请求」：旧行程被丢弃，电梯立刻追新目标。
- 配合一个闭包 `current` 记住「被打断时的真实楼层」，就能让半路改主意时**无缝接着走**，而不是瞬移重来。

</ConceptCard>

➡️ 下一课：[L4 · 上行还是下行](/guide/l4-direction)
