<script setup>
import { program } from '@/lessons/l6'

// 情景：电梯停在 3 层，先后有人按了 7、5、2 层。
// LOOK 算法的服务顺序不是「谁先按谁先到」，而是「顺路优先」：
// 先一路上行 3→5→7，再掉头下行 7→2。下面这张图把这个顺序画出来。
const spec = {
  streams: [
    { label: '按下楼层', events: [
      { time: 1, value: '7' }, { time: 2, value: '5' }, { time: 3, value: '2' },
    ] },
    { label: '心跳 tick', events: [
      { time: 1, value: '•' }, { time: 2, value: '•' }, { time: 3, value: '•' },
      { time: 4, value: '•' }, { time: 5, value: '•' }, { time: 6, value: '•' },
      { time: 7, value: '•' }, { time: 8, value: '•' }, { time: 9, value: '•' },
      { time: 10, value: '•' }, { time: 11, value: '•' }, { time: 12, value: '•' },
    ] },
    { label: 'scan ↓（LOOK 状态机）', isOperator: true, events: [] },
    { label: '电梯所在层', events: [
      { time: 1, value: '3' },
      { time: 2, value: '4' },
      { time: 3, value: '5', color: '#f0a020', tip: '到 5 层，开门' },
      { time: 4, value: '5', color: '#f0a020', tip: '停留，门还开着' },
      { time: 5, value: '6' },
      { time: 6, value: '7', color: '#f0a020', tip: '到 7 层，开门（上行扫到顶）' },
      { time: 7, value: '7', color: '#f0a020', tip: '停留' },
      { time: 8, value: '6' },
      { time: 9, value: '5' },
      { time: 10, value: '4' },
      { time: 11, value: '3' },
      { time: 12, value: '2', color: '#f0a020', tip: '掉头下行，最后到 2 层' },
    ] },
  ],
  frames: 13,
}

const captions = {
  0: '电梯停在 3 层，没有任务。下面这条「心跳 tick」是 timer 流，每一帧催电梯走一步。',
  1: '有人按了 7 层。scan 把 7 并进目标集合 {7}，电梯准备上行。',
  2: '又按了 5 层。注意：5 在 3 和 7 之间，顺路！目标变成 {5,7}，电梯刚迈到 4 层。',
  3: '再按 2 层。但电梯正上行，2 在身后——先存着 {2,5,7}。这一帧电梯到 5 层，开门（橙色）。',
  4: '到站要停留：门开着原地等一帧，这就是 dwell 倒计时在起作用。',
  6: '关门继续上行，扫到 7 层——这一方向最远的目标，到顶、开门。',
  8: '上行没有目标了，LOOK 算法掉头！开始下行去服务身后那个 2 层。',
  12: '一路下行 7→6→5→4→3，最后到 2 层开门。全程：先上行扫到底，再掉头，顺路的都顺手做了。',
}
</script>

# L6 · SCAN 调度算法

上一课（L5）我们搭好了 **`merge` + `scan`** 的骨架：把「请求流」和「心跳流」汇成一条流，再用 `scan` 像滚雪球一样，拿「上一帧的电梯状态」加上「这一帧的事件」，算出「这一帧的新状态」。

骨架有了，可里头那个「怎么算」还很简陋。这一课我们钻进 `scan` 的内部，把它变成一个**真正会调度的电梯大脑**：一次按下好几层，它该先去哪、后去哪？到站了要不要停一下让人上下？

## 先想清楚：电梯到底按什么顺序跑？

假设电梯停在 **3 层**，紧接着有人按了 **7、5、2** 三层。最笨的做法是「谁先按先去谁」：3→7→5→2，来回折返，又慢又晕。

真实电梯用的是一条朴素又聪明的规则，叫 **LOOK 算法**：

> **朝一个方向一路扫到底，途中顺路的目标统统服务掉；这个方向没目标了，再掉头扫回来。**

所以正确顺序是：先上行 **3→5→7**（5 顺路，先做掉），到顶掉头，再下行 **7→2**。这套规则，全藏在 `engine.advance` 这个纯函数里——我们的 `scan` reducer 只要在每个心跳调用它就行。

<ConceptCard title="reducer 即状态机" icon="🛗">

`scan` 的回调（reducer）签名是 `(上一帧状态, 这一帧事件) => 新状态`。

这正是「**状态机**」的定义：**当前状态 + 一个输入 → 下一个状态**。

- 输入是「请求」→ 把目标楼层并进计划（`addTarget`）。
- 输入是「心跳」→ 让电梯按 LOOK 推进一帧（`advance`）。

`scan` 替我们记住「上一帧」，我们只需描述「这一帧该怎么变」。没有全局可变变量，没有 setInterval 散落各处——**整部电梯的运行逻辑，就是这一个纯函数**。

</ConceptCard>

## 看得见：LOOK 如何决定服务顺序

下面这张图，最上面是「按下的楼层」，第二行是 `timer` 发出的「心跳」（每帧催电梯走一步），中间经过 `scan` 这个状态机，最下面就是电梯**真实的所在层**。点 ▶ 播放，重点看橙色弹珠——那是「到站开门」的时刻：

<MarblePlayer :spec="spec" :captions="captions" />

读懂这条输出流，你就读懂了 LOOK：**3→5→7（上行扫到顶）→ 掉头 →2（下行扫回来）**。2 层明明是第三个按的，却最后才到，因为它在电梯身后、不顺路。这不是 bug，正是电梯该有的聪明。

## 到站要「停一下」：给状态加一个倒计时

电梯到了一层，不能门一开马上又关着走人——得停几帧让人上下。我们给 `scan` 流动的状态**包一层壳**，多带一个倒计时字段：

```ts
interface CarRuntime {
  plan: CarPlan      // engine 的调度计划（楼层、方向、目标集合）
  dwell: number      // 还要在本层停留几帧（门开着、不移动）
  doorsOpen: boolean // 门此刻开没开
}
```

`dwell` 该设几帧？由楼栋配置算出来——开关门耗时 `doorMs` 相当于几个「楼层节拍」`msPerFloor`：

```ts
const dwellFrames = Math.max(1, Math.round(doorMs / msPerFloor))
```

## 代码：reducer 的三种分支

整个状态机就是 `scan` 里这一个函数，按「来的是什么事件」分三种情况：

```ts
scan((state, ev) => {
  // ① 请求事件：只把目标并进计划，先不动（移动交给心跳）。
  if (ev.kind === 'request') {
    return { ...state, plan: addTarget(state.plan, ev.req.floor) }
  }

  // ② 心跳 + 正在开门停留：原地等，倒计时减一；归零这帧把门关上。
  if (state.dwell > 0) {
    const dwell = state.dwell - 1
    return { ...state, dwell, doorsOpen: dwell > 0 }
  }

  // ③ 心跳 + 该走了：按 LOOK 推进一帧。
  const before = state.plan.targets.length
  const plan = advance(state.plan)             // ← LOOK 算法在这里
  const arrived = plan.targets.length < before // 这帧摘掉了目标 = 到站
  return arrived
    ? { plan, dwell: dwellFrames, doorsOpen: true } // 到站：开门 + 设停留
    : { plan, dwell: 0, doorsOpen: false }          // 路过：关门继续走
}, seed)
```

逐句体会：

- **`addTarget` / `advance` 都是纯函数**——给定输入必有同样输出，没有副作用。reducer 把它们「编排」在时间上：请求来了就并目标，心跳来了就推一步。
- **`dwell` 这个倒计时**，让「到站停留」自然地占用了若干帧：`dwell > 0` 时电梯原地不动、门开着，直到归零才恢复 `advance`。
- **`arrived` 怎么判断？** `advance` 一旦把脚下这层（一个目标）摘掉，目标数就少了一个。目标变少，就说明「这一帧到站了」，于是开门、上倒计时。

最后两步收尾，和前几课一样：

```ts
.pipe(
  map((state) => [toState(state.plan, { doorsOpen: state.doorsOpen })]),
  distinctUntilChanged((a, b) => sameState(a[0], b[0])),
)
```

`map` 把内部 `CarRuntime` 投影成 UI 要的 `ElevatorState`（始终是长度 1 的数组）；`distinctUntilChanged` 把「看起来一样」的相邻帧去重，免得 UI 抖动。

## 动手：一次按好几层，看它怎么排队

下面是把这段 `program` 真的跑起来的电梯。**连着按几个楼层**（有上有下最明显），看它如何按 LOOK 顺序逐一服务、每到一站短暂开门再走：

<ElevatorRunner :program="program" :floors="8" :msPerFloor="600" :doorMs="1200" :showLog="true" />

试试这个经典序列：电梯在低层时，飞快按下 **7 → 5 → 2**。你会看到它**先一路上行到 7（顺路收掉 5），再掉头下来收 2**，而不是傻乎乎地按按下顺序折返。每到一层，门会开一下（`dwell` 在停留），然后继续。

## 本课你迈过的台阶

这一课没有引入新操作符——`merge`、`timer`、`scan`、`map`、`distinctUntilChanged` 都是老朋友。真正的成长在于：**你把整部电梯的「大脑」写进了一个 `scan` 的纯函数里**。

<ConceptCard title="本课小结" icon="✅">

- **reducer 即状态机**：`scan((上一帧, 事件) => 新状态)`，`scan` 替你记住历史，你只描述「这一帧怎么变」。
- **LOOK 算法**藏在 `engine.advance` 里：朝一个方向扫到底、顺路全服务，再掉头。reducer 只管在每个心跳调用它。
- **到站停留**用一个 `dwell` 倒计时字段实现：到站设 `dwell=N`、`doorsOpen=true`，`dwell>0` 时原地递减不移动，归零再继续 `advance`。停几帧由 `doorMs / msPerFloor` 决定。
- 全程**没有可变全局变量、没有散落的定时器**：一条流进、一条状态流出，逻辑全在纯函数里。

</ConceptCard>

➡️ 下一课：[L7 · 多部电梯协同](/guide/l7-multi-car)
