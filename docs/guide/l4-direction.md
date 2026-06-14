<script setup>
import { program } from '@/lessons/l4'

// 同一个 switchMap，面对两个方向相反的请求，生成两段方向相反的运动子流。
// 场景：电梯停在 1 层。
//   第 1 帧：有人按「4 层 ▲」(上行) → 电梯 1→2→3→4 一路上行；
//   第 6 帧：有人按「2 层 ▼」(下行) → 电梯此刻在 4 层，于是 4→3→2 一路下行。
const spec = {
  streams: [
    { label: '大厅请求(带方向)', events: [
      { time: 1, value: '4▲', color: '#3b82f6', tip: '去 4 层 · 上行' },
      { time: 6, value: '2▼', color: '#ef4444', tip: '去 2 层 · 下行' },
    ] },
    { label: 'filter ↓ 挡掉无效', isOperator: true, events: [] },
    { label: 'switchMap ↓ 按方向分叉', isOperator: true, events: [] },
    { label: '电梯所在层', events: [
      // 上行子流：蓝色，楼层递增
      { time: 1, value: '1', color: '#3b82f6' },
      { time: 2, value: '2', color: '#3b82f6' },
      { time: 3, value: '3', color: '#3b82f6' },
      { time: 4, value: '4', color: '#3b82f6', tip: '到 4 层 · 开门' },
      // 下行子流：红色，楼层递减
      { time: 6, value: '4', color: '#ef4444' },
      { time: 7, value: '3', color: '#ef4444' },
      { time: 8, value: '2', color: '#ef4444', tip: '到 2 层 · 开门' },
    ] },
  ],
  frames: 10,
}

const captions = {
  0: '电梯静止在 1 层，等待请求。',
  1: '第 1 帧：有人按「4 层 ▲」。4 在当前层 1 的上方 → switchMap 生成一条「上行」子流。',
  2: '上行子流逐帧递增：电梯从 1 往上挪，方向一路是 up（蓝色）。',
  4: '走到 4 层，到站开门，这段上行子流结束。',
  6: '第 6 帧：有人按「2 层 ▼」。此刻电梯在 4 层，2 在它下方 → 同一个 switchMap 这次生成一条「下行」子流。',
  7: '下行子流逐帧递减：4→3→2，方向变成 down（红色）—— 注意它和上一段方向完全相反。',
  8: '走到 2 层，到站开门。一个 switchMap，两种方向的子流，全看请求落在当前层的哪一侧。',
}
</script>

# L4 · 上行还是下行

上一课电梯已经会「一层层地走到目标层」了。但你有没有发现：真实的大厅按钮其实有**两个** —— ▲ 和 ▼。站在 5 层按 ▲，是想往楼上去；按 ▼，是想下楼。这一课，我们让请求**带上方向**，并处理两件新事情：怎么**挡掉没意义的请求**，怎么让同一段代码生出**方向相反**的两种运动。

## 先看一个尴尬的情况

电梯正停在 3 层，这时有人又按了一下「3 层」。电梯该怎么办？答案是：**什么都不该做**。目标就是脚下这层，没必要动。

在 L1～L3 里，每个进来的请求我们都老老实实生成了一段子流。但像「请求当前层」这种请求，根本不值得开一段子流。我们需要一道「门卫」，在请求进入管道深处之前就把它**拦下来**。这道门卫就是 `filter`。

<ConceptCard title="filter：只放行满足条件的值" icon="🛗">

`map` 是「**每个**值都变换、都放行」；`filter` 不一样 —— 它只让**满足条件**的值通过，不满足的**直接消失**，后面的操作符根本看不到它。

```ts
requests$.pipe(
  filter((req) => req.floor !== current), // 请求的是当前层？挡掉，不放行。
)
```

把它想成电梯门口的保安：手里那张「请求」如果是「去你已经在的这层」，保安直接说「您不用坐了」，请求就到此为止，**连子流都不会生成**。

</ConceptCard>

## 同一个 switchMap，两种方向

挡掉无效请求后，剩下的都是「真要去别的楼层」的请求。这时关键的一步来了：目标层在当前层的**上面**还是**下面**？

- 目标在上方 → 电梯要**上行**：楼层一帧帧 **+1**，`direction` 是 `'up'`。
- 目标在下方 → 电梯要**下行**：楼层一帧帧 **−1**，`direction` 是 `'down'`。

这两种运动「形状相反」，但都由**同一个** `switchMap` 生出来 —— 它每次根据请求的落点，临时决定生成哪一种子流。下面这张弹珠图把这件事演给你看：上面进来一个上行请求、一个下行请求，下面 `switchMap` 就分别长出方向相反的两段运动。点 ▶ 或用 ⏭ 一帧帧拨：

<MarblePlayer :spec="spec" :captions="captions" />

注意看下面那条「电梯所在层」：前半段是**蓝色、楼层递增**（上行子流），后半段是**红色、楼层递减**（下行子流）。代码只有一个 `switchMap`，是「目标在当前层哪一侧」这个判断，让它分叉出了两种相反的流。

## 代码：一句判断分出两条路

这一课最核心的就是 `switchMap` 里的这几行（完整版见 `src/lessons/l4.ts`）：

```ts
import { filter, switchMap, map, takeWhile, timer } from 'rxjs'

let current = 1 // 闭包记住电梯当前停在哪层

requests$.pipe(
  // ① 门卫：请求的就是当前层 → 挡掉，连子流都不生成
  filter((req) => req.floor !== current),

  switchMap((req) => {
    const from = current
    const target = req.floor
    // ② 一句判断，分出上行 / 下行两种子流
    const dir = target > from ? 'up' : 'down'
    const step = dir === 'up' ? 1 : -1

    return timer(0, tickMs).pipe(
      map((n) => {
        const floor = from + step * n // 上行 +1、下行 −1
        const arrived = floor === target
        current = floor // 走到哪，current 就更新到哪
        return [{ floor, direction: arrived ? 'idle' : dir,
                  doors: arrived ? 'open' : 'closed',
                  targets: arrived ? [] : [target] }]
      }),
      takeWhile((s) => s[0].floor !== target, true), // 到站后再发一帧就停
    )
  }),
)
```

逐句拆开看：

- `filter((req) => req.floor !== current)`：第一道关卡。`current` 是闭包里记的「电梯现在在几层」。请求若正好是这层，条件为 `false`，这个值就被**丢弃**，下面的 `switchMap` 永远收不到它。
- `const dir = target > from ? 'up' : 'down'`：**全课的灵魂**。仅凭目标与起点的大小关系，就决定了这趟是上行还是下行 —— 进而决定 `step` 是 `+1` 还是 `−1`、`direction` 字段是 `'up'` 还是 `'down'`。
- `const floor = from + step * n`：`timer` 每发一个递增的 `n`（0,1,2…），就把楼层往对应方向推一格。上行越走越高，下行越走越低。
- `takeWhile(..., true)`：到达目标层后再补发一帧（开门），随即结束这段子流，等待下一个请求。

整段代码依旧**没有循环**：你只是描述了「一个有效请求，应该展开成怎样一段随时间到来的状态」，方向相反的两条路，全靠那一句三元判断分出来。

## 动手：按带方向的大厅按钮

下面把这段 `program` 真的跑起来。试试在不同楼层按 ▲ / ▼ 大厅按钮，看电梯朝对应方向一层层挪过去；再试试**按一下电梯当前所在那层** —— 你会看到它纹丝不动，因为那个请求被 `filter` 当场挡掉了：

<ElevatorRunner :program="program" :floors="8" :showLog="true" />

<ConceptCard title="本课小结" icon="✅">

- `filter` 是流上的「门卫」：只放行满足条件的值，其余**直接消失**，后面的操作符根本看不到 —— 我们用它挡掉了「请求当前层」这种无意义请求。
- 同一个 `switchMap`，可以根据每个请求的具体情况，生成**结构不同**的子流：靠一句 `target > from` 判断，就分叉出方向、步进都相反的「上行段」与「下行段」。
- 闭包变量 `current` 像一本小账，记着电梯此刻在哪层，既供 `filter` 判断、又供下一趟当起点。

不过现在的电梯还很「健忘」：你连按好几层，它只会响应**最后一个**（`switchMap` 会打断上一段）。真实电梯应该把请求**排队记下来**，一个个服务。下一课我们就用 `scan` 给它装上记忆。

</ConceptCard>

➡️ 下一课：[L5 · 排队：累积请求](/guide/l5-scan-queue)
