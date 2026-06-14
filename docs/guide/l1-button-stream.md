<script setup>
import { program } from '@/lessons/l1'
import { parseMarbles } from '@/domain/marble'

// 一条「按钮点击」流：第 1、4、8 帧分别点了 3、7、5 层。
const spec = {
  streams: [
    { label: '按钮点击', events: [
      { time: 1, value: '3' }, { time: 4, value: '7' }, { time: 8, value: '5' },
    ] },
    { label: 'map ↓', isOperator: true, events: [] },
    { label: '电梯所在层', events: [
      { time: 1, value: '3', color: '#21c0a8' },
      { time: 4, value: '7', color: '#21c0a8' },
      { time: 8, value: '5', color: '#21c0a8' },
    ] },
  ],
  frames: 11,
}

const captions = {
  0: '一开始什么都没发生，电梯静止在 1 层。',
  1: '第 1 帧：有人按了 3 层。这次点击是流上的一个「事件」。',
  2: 'map 把这个事件变成一帧电梯状态：电梯出现在 3 层。',
  4: '第 4 帧：又有人按 7 层 —— 同样被 map 变成「电梯在 7 层」。',
  8: '第 8 帧：按 5 层。每一次点击，进来一个值，出去一个值，一一对应。',
}
</script>

# L1 · 一个按钮，一条流

我们从最小的电梯开始：**按哪层，电梯就出现在哪层**（先不管它怎么过去，下一课再让它动起来）。麻雀虽小，却足以讲清 RxJS 最核心的那句话。

## 先换一个看世界的角度

平时我们会这样想按钮：「用户点击 → 触发一个回调函数」。RxJS 让你换一个角度：

> 把「这个按钮被按过的所有次」想象成时间轴上的一串点，它们合起来是**一条流**（Observable）。

<ConceptCard title="Observable：随时间到来的一串值">

普通数组是「**此刻**就摆在你面前的一串值」：`[3, 7, 5]`。
Observable 是「**随着时间**陆续到来的一串值」：第 1 秒来个 3，第 4 秒来个 7，第 8 秒来个 5。

数组用 `.map()` 加工；Observable 也用 `map` 加工 —— **思路一模一样，只是多了「时间」这一维**。

</ConceptCard>

## 看得见：一次点击，一帧电梯

下面这张弹珠图，每个圆圈是一个「值」，横轴是时间。点 ▶ 播放，或者用 ⏭ 一帧一帧地拨，看上面的「点击流」如何被 `map` 变成下面的「电梯所在层」：

<MarblePlayer :spec="spec" :captions="captions" />

看懂这张图，你就抓住了 `map` 的全部：**它不改变事件发生的「时间」，只改变每个事件携带的「值」。** 上面进来一个 `3`，下面就出去一个「电梯在 3 层」，时刻完全对齐。

## 代码：只有一个 `map`

这一课的电梯逻辑，去掉注释只有三行：

```ts
import { map } from 'rxjs'

export const program = (requests$) =>
  requests$.pipe(
    // requests$ 里每个值是一次请求 { floor, ... }
    map((req) => [{ floor: req.floor, direction: 'idle', doors: 'open', targets: [] }]),
  )
```

逐句拆开：

- `requests$` 就是那条「按钮点击流」。约定俗成，流的变量名以 `$` 结尾，提醒你「这是一条流，不是一个值」。
- `.pipe(...)` 是「把流送进一串加工管道」。括号里放操作符。
- `map(req => ...)` 对流里**每一个**请求做同样的变换：把请求变成「一帧电梯状态」（这里我们用长度为 1 的数组表示「只有一部电梯」）。

整段代码**没有一个 `if`、没有循环、没有可变变量**。你只是在描述「输入的每个值，应该变成什么样的输出」—— 这就是响应式的味道。

## 动手：点一点真电梯

下面是把上面这段 `program` 真的跑起来的电梯。点右侧楼层的 ▲ / ▼ 大厅按钮，或轿厢里的数字按钮，看电梯「啪」地出现在那一层：

<ElevatorRunner :program="program" :floors="8" />

是不是有点生硬？电梯瞬移了，没有「移动过程」。这恰恰是因为：**一次点击只产出了一帧状态**。要让它一层层地动，我们得让「一次点击」展开成「一串随时间到来的状态」。

这正是下一课的主角 —— `switchMap`。

<ConceptCard title="本课小结" icon="✅">

- Observable（流）= 随时间到来的一串值；数组在「空间」上排开，流在「时间」上排开。
- `map` 把流里每个值变成另一个值，**不动时间，只换内容**。
- `pipe` 把流送进操作符管道；变量名习惯用 `xxx$` 结尾。

</ConceptCard>

➡️ 下一课：[L2 · 让电梯动起来](/guide/l2-interval-move)
