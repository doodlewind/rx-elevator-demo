/**
 * L5 · 排队：累积请求
 * ----------------------------------------------------------------
 * 到上一课为止，电梯「一次只盯着一个目标」：点了 7 层就去 7 层，途中你再点
 * 3 层，前一个目标要么被冲掉、要么得等它先忙完。真实电梯显然不是这样 ——
 * 它会把你按过的每一层都「记在小本本上」，攒成一个「待办楼层集合」，再一趟
 * 一趟服务。
 *
 * 这一课就是质变：电梯要把「多次点击」累积成「一份不断演化的计划」。
 *
 * 能把「一串事件」滚成「一个不断更新的状态」的操作符，正是 scan。
 * scan 就像数组的 reduce，但它不是只在最后吐一个结果，而是「每吃进一个事件，
 * 就把当前的中间结果发出来一次」—— 完美对应「状态随时间演化」。
 *
 * 思路（三步）：
 *  1. merge：把「用户点击流」和「时钟滴答流」两条流汇成一条「事件流」。
 *     - add  事件来自按钮：「把某层加进待办」
 *     - tick 事件来自时钟：「时间又过去一帧，电梯该挪一步了」
 *  2. scan：拿一个 reducer 吃这条事件流，维护一份 CarPlan（楼层 + 方向 + 待办集合）。
 *     - 遇到 add  → addTarget(plan, floor)：把目标并进集合（engine 负责去重排序）
 *     - 遇到 tick → advance(plan)：朝目标挪一层 / 到站摘掉目标（engine 负责 LOOK 调度）
 *  3. map + distinctUntilChanged：把内部 CarPlan 投影成 UI 状态，并滤掉「没变化的帧」。
 *
 * 调度细节（怎么移动、怎么掉头）全部交给 domain/engine.ts 的纯函数，
 * 我们这一课只负责「编排」：把事件喂给 scan，让状态一帧帧长出来。
 *
 * 新概念：scan（把一串事件累积成不断演化的状态，reduce 的「每步都发」版本）。
 * 复用：merge、timer、map、distinctUntilChanged。
 */
import { merge, timer, map, scan, distinctUntilChanged } from 'rxjs'
import { addTarget, advance, initialPlan, toState } from '@/domain/engine'
import { sameState } from '@/domain/types'
import type { ElevatorProgram } from '@/domain/runner'
import type { ElevatorState } from '@/domain/types'

/** 流过 scan 的两种事件：用户加目标 / 时钟滴答。用可辨识联合，reducer 里好 switch。 */
type PlanEvent =
  | { kind: 'add'; floor: number }
  | { kind: 'tick' }

export const program: ElevatorProgram = (requests$, ctx) => {
  // 时钟流：立刻滴答一次，之后每过 msPerFloor 毫秒再滴答一次 → tick, tick, tick…
  const clock$ = timer(0, ctx.building.msPerFloor).pipe(
    map((): PlanEvent => ({ kind: 'tick' })),
  )

  // 点击流：把每个请求翻译成一个 add 事件，只关心「要去哪一层」。
  const adds$ = requests$.pipe(
    map((req): PlanEvent => ({ kind: 'add', floor: req.floor })),
  )

  // merge 把两条流汇成一条事件流：谁先到谁先发，交织在同一条时间轴上。
  return merge(adds$, clock$).pipe(
    // scan：reducer 吃事件、滚动出一份不断更新的 CarPlan。
    scan(
      (plan, ev) =>
        ev.kind === 'add' ? addTarget(plan, ev.floor) : advance(plan),
      initialPlan(ctx.building),
    ),
    // 投影成 UI 状态。停靠（脚下没有更多目标可走时）由 engine 通过 direction 表达，
    // 这里门是否开合留给后续课程细化，先统一渲染为关门的运动/待命态。
    map((plan): ElevatorState[] => [toState(plan, { doorsOpen: false })]),
    // 相邻两帧若「视觉上相同」（比如电梯停着、连发好几个 tick），就不重复发。
    distinctUntilChanged((a, b) => sameState(a[0], b[0])),
  )
}
