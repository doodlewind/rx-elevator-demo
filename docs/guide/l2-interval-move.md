<script setup>
import { program } from '@/lessons/l2'

// 从 1 层去 7 层：一条随时间逐层到来的状态流。
const spec = {
  streams: [
    { label: '按钮点击', events: [{ time: 0, value: '7', tip: '点了 7 层' }] },
    { label: 'switchMap ↓', isOperator: true, events: [] },
    { label: '电梯所在层', events: [
      { time: 0, value: '1' }, { time: 1, value: '2' }, { time: 2, value: '3' },
      { time: 3, value: '4' }, { time: 4, value: '5' }, { time: 5, value: '6' },
      { time: 6, value: '7', color: '#21c0a8', tip: '到达，开门' },
    ] },
  ],
  frames: 9,
}

const captions = {
  0: '第 0 帧：点了 7 层。注意——这一次点击，即将展开成「一长串」状态。',
  1: 'switchMap 为这次点击开了一条「内层流」：timer 每帧滴答一次，电梯上升一层。',
  3: '内层流还在持续发射：3→4→5…… 一次输入，正在产出多个随时间到来的输出。',
  6: '到达 7 层，takeWhile 让内层流发完这一帧就结束。电梯停下、开门。',
}
</script>

# L2 · 让电梯动起来

上一课电梯会瞬移，因为**一次点击只产出了一帧状态**。真实电梯得一层层地走 —— 也就是说，**一次点击要产出「一串随时间到来」的状态**。

谁能把「流里的一个值」展开成「一条会持续发射的子流」？这就是高阶操作符 `switchMap` 登场的时刻。

## 从「一个值」到「一条子流」

<ConceptCard title="switchMap：把每个值换成一条流" icon="🔀">

`map` 把一个值变成**另一个值**（点 7 层 → 一帧「电梯在 7 层」）。

`switchMap` 把一个值变成**一整条流**（点 7 层 → 一条「1→2→3→…→7」逐层上升的流），然后把这条子流的每个值，铺到外层流上输出。

「一对多」的展开能力，正是让静止数据「动起来」的关键。

</ConceptCard>

## 看得见：一次点击，铺开成一段上升

点 ▶ 播放，看上面**一次**点击（7 层），如何被 `switchMap` 展开成下面**一连串**随时间到来的楼层：

<MarblePlayer :spec="spec" :captions="captions" />

注意上下两行的根本差别：上面只有 1 个圆圈，下面有 7 个。`switchMap` 把「点」拉成了「线」。

## 代码：`switchMap` + `timer`

```ts
import { switchMap, map, takeWhile, timer } from 'rxjs'

let current = 1 // 记住电梯停在哪，作为下一趟起点

const program = (requests$, ctx) =>
  requests$.pipe(
    switchMap((req) => {            // 每个请求 → 一条运动子流
      const from = current, target = req.floor
      const step = target > from ? 1 : -1
      return timer(0, ctx.building.msPerFloor).pipe(  // 每帧滴答一次
        map((n) => {
          const floor = from + step * n               // 第 n 帧，挪了 n 层
          current = floor
          const arrived = floor === target
          return [{ floor, direction: arrived ? 'idle' : (step > 0 ? 'up' : 'down'),
                    doors: arrived ? 'open' : 'closed', targets: arrived ? [] : [target] }]
        }),
        takeWhile((s) => s[0].floor !== target, true), // 到目标层，发完这帧就停
      )
    }),
  )
```

三个新朋友：

- `timer(0, ms)`：立刻发一个 `0`，之后每隔 `ms` 发 `1, 2, 3…`。它就是电梯的「心跳/节拍器」。
- `switchMap`：把每个请求换成上面那条节拍驱动的运动子流。
- `takeWhile(pred, true)`：当电梯还没到目标层就继续；一旦到达，`true` 这个参数让它**把到达那一帧也发出来**（开门）再结束子流。

## 动手：现在它会一层层地走了

<ElevatorRunner :program="program" :floors="8" />

试试点 8 层，看它慢慢爬上去。然后**在它还在半路时**，赶紧点另一层 —— 你会发现它「立刻改主意」、丢下原来的目标转头就去新的。

为什么旧行程说没就没？因为 `switchMap` 有一个杀手锏：**新值一来，它会立刻退订（取消）上一条还没结束的子流**。这正是下一课的主题。

<ConceptCard title="本课小结" icon="✅">

- `timer(0, ms)` 造出按时间节拍的流，是让画面「动」起来的心跳。
- `switchMap` 把流里每个值展开成一条**子流** —— 从「点」到「线」。
- `takeWhile(pred, true)` 在满足条件时优雅地结束一条流，并保留最后一帧。

</ConceptCard>

➡️ 下一课：[L3 · 一次只服务一个请求](/guide/l3-switchmap)
