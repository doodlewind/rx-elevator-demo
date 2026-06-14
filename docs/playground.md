# Playground · 自己的电梯，自己写

前面九课，我们一行行把电梯的「大脑」搭了出来：从 `map`、`switchMap`，到 `merge + scan` 的调度状态机。现在轮到你了。

这一页是一块**空白的实验台**：左边是一个真正的代码编辑器，你写一段返回 `program` 的代码，点「运行」，右边的电梯就会照你写的逻辑动起来。你可以点楼层按钮、点轿厢内按钮，看自己的「流」怎么把这些点击变成电梯的上上下下。

最好的学法，就是**把课程里现成的管道拆开来改一改**：换个操作符、改个时间间隔、多加一节 `pipe`，然后立刻看它出什么乱子。改坏了也没关系 —— 这里没有任何东西会被弄丢，刷新一下就回到起点。

<Playground :floors="10" />

## 怎么玩

编辑器里你要写的，是一段**返回 `program` 函数**的代码。`program` 的长相和每一课里 `export const program` 完全一样：

```ts
// 你写的代码，最后必须 return 一个这样的函数：
return function program(requests$, ctx) {
  // ……在这里用 requests$ 和 ctx 拼出一条流……
  return /* 一个 Observable，每帧吐出 [ {floor, direction, doors, targets} ] */
}
```

<ConceptCard title="三件你必须知道的事" icon="🛠️">

**1. `requests$` 是「按钮点击流」。**
你每点一次右边的楼层或轿厢按钮，这条流就吐出一个值，长这样：

```ts
{ floor: 7, direction: 'up', source: 'hall' }  // 有人在大厅按了去 7 层
```

它是一条**随时间**慢慢冒出值的流 —— 不点就不冒。你的工作，就是把它接成一条「电梯该怎么动」的流。

**2. `ctx.building` 是楼的参数。**
里面有 `floors`（总楼层数）、`cars`（电梯数量）、`msPerFloor`（爬一层要多少毫秒）、`doorMs`（开关门要多少毫秒）。需要做 `timer` 节拍、算停留几帧时就从这儿取，别写死数字。

**3. 你必须 `return` 那个 program 函数。**
编辑器里的代码会被当成一个函数体来执行，**它的返回值就是你的电梯程序**。忘了 `return`，电梯就不会动。

</ConceptCard>

### `rx.xxx`：不用 import，直接拿来用

平时在课程文件里，我们要写 `import { switchMap, timer, map } from 'rxjs'`。但在这个 Playground 里，所有 RxJS 的**创建函数**和**操作符**都已经塞进一个全局的 `rx` 对象里了，直接点出来用就行：

```ts
return function program(requests$, ctx) {
  const { msPerFloor } = ctx.building
  return requests$.pipe(
    rx.switchMap((req) => {           // ← rx.switchMap，不用 import
      const target = req.floor
      return rx.timer(0, msPerFloor).pipe(  // ← rx.timer
        rx.map((n) => {                     // ← rx.map
          const floor = Math.min(target, 1 + n)
          const arrived = floor === target
          return [{
            floor,
            direction: arrived ? 'idle' : 'up',
            doors: arrived ? 'open' : 'closed',
            targets: arrived ? [] : [target],
          }]
        }),
        rx.takeWhile((s) => s[0].floor !== target, true),
      )
    }),
  )
}
```

上面这段就是一台能跑的简化版电梯：你按几层，它就爬几层。把它粘进编辑器、点「运行」试试，然后从它开始改。

> 小提醒：输出永远是**数组**。单电梯就返回长度为 1 的数组 `[{...}]`；状态对象里 `floor / direction / doors / targets` 四个字段缺一不可。

## 试试看：四个改造点子

别只是看，动手把上面那段代码改成下面这些样子，每改一次都点一下「运行」，注意电梯的行为差在哪：

1. **把 `switchMap` 换成 `mergeMap`。**
   原来电梯「一次只追一个目标」（`switchMap` 会取消上一个）。换成 `rx.mergeMap` 后，每个请求都各开一条子流、谁也不取消谁 —— 你会看到几条子流抢着改楼层，电梯像被好几个人同时遥控，乱成一团。亲眼看看「切换」和「并行」的区别。（这正是 L3 讲的事。）

2. **给 `requests$` 先加一节 `debounceTime`。**
   在 `.pipe(` 的最前面塞一个 `rx.debounceTime(500)`：
   ```ts
   requests$.pipe(
     rx.debounceTime(500),   // ← 新增：500ms 内连点只算最后一下
     rx.switchMap((req) => { /* …… */ }),
   )
   ```
   然后快速连点好几个楼层，会发现电梯**只响应你停手前的最后一下**。这是给「手抖连点」去噪的常用招。

3. **改 `timer` 的间隔，让电梯变快或变慢。**
   把 `rx.timer(0, msPerFloor)` 里的 `msPerFloor` 改成 `msPerFloor / 3`（更快）或 `msPerFloor * 2`（更慢）。同一段逻辑，节拍一变，电梯的「手感」立刻不同。体会一下：**时间，也是流的一部分。**

4. **加一节 `filter`，做个「只停偶数层」的怪电梯。**
   在 `switchMap` 前面加 `rx.filter((req) => req.floor % 2 === 0)`，按奇数层时电梯干脆不理你。无聊？但它让你真切感到：你写的每一节 `pipe`，都是在**对流做加工**。

## 想不出来？回去抄作业

卡住很正常 —— Playground 的乐趣本来就是「改」，而不是「从零想」。最快的办法，是回到课程里把对应那一课的核心代码**抄过来**，再在上面动手：

- 想玩「一次只追一个目标 / 半路改主意」？回 [L3 · 一次只服务一个请求](/guide/l3-switchmap)，把那段 `switchMap + current` 抄进来。
- 想玩「能记住一串目标、按 LOOK 算法挨个跑」的真调度？回 [L6 · SCAN 调度算法](/guide/l6-scan-algorithm)，把 `merge + scan` 那套搬过来（记得用 `rx.merge`、`rx.scan`），它能处理你连续按下的一整队楼层。

把课程的代码贴进来跑通，再回头改掉其中一两行，是吃透 RxJS 最扎实的一步。祝你玩得开心，电梯别开太快 🛗

➡️ 回到 [课程首页](/guide/intro) 重温任意一课，或翻翻 [操作符速查表](/guide/cheatsheet)。
