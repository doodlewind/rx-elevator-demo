/**
 * L9 · 完整模拟器（毕业作品）
 * ================================================================
 * 这是这门课的「集大成」。我们把前八课学到的东西拼成一台真正能玩的电梯系统：
 *
 *   · L1 map        —— 把每个请求映射成状态
 *   · L2 timer      —— 用一条节拍流让电梯随时间一层层地动
 *   · L3/L4 高阶/合并—— switchMap / merge 把多条流编织在一起
 *   · L5 scan       —— 用「reducer + 累积状态」记住电梯此刻的全部计划
 *   · L6 LOOK+开门  —— 到站停留（dwell），engine 里的 advance/nextDirection
 *   · L7 多电梯派单 —— engine.pickCar 选最顺路的那一部
 *   · L8 去抖/去重  —— debounceTime + distinctUntilChanged 清洗输入
 *
 * 核心思路：把「世界」分成两类事件，merge 成一条流，再用一个 scan 维护全部状态。
 *
 *   1) 用户请求流 requests$（按钮按下）—— 先去抖、去重，再喂进来；
 *   2) 时钟流 tick$（timer 每 msPerFloor 发一拍）—— 推动电梯「走一层」。
 *
 *   merge(requests$..., tick$).pipe(scan(reducer, 初始世界))
 *
 * reducer 是纯函数：吃「当前世界 + 一个事件」，吐「下一刻的世界」。
 * 它内部用 engine.ts 里那组久经考验的纯函数来调度，绝不自己手写调度逻辑。
 *
 * 世界（World）= 每部电梯的 CarPlan[] + 每部电梯的开门倒计时 dwell[]。
 */
import {
  merge,
  timer,
  map,
  scan,
  debounceTime,
  distinctUntilChanged,
  type Observable,
} from 'rxjs'
import {
  initialPlan,
  addTarget,
  advance,
  pickCar,
  toState,
  type CarPlan,
} from '@/domain/engine'
import type { ElevatorProgram } from '@/domain/runner'
import type { ElevatorRequest, ElevatorState } from '@/domain/types'

/** 内部「事件」：要么是一个用户请求，要么是一次时钟滴答。 */
type Tick = { kind: 'tick' }
type Req = { kind: 'req'; req: ElevatorRequest }
type Event = Tick | Req

/** 整个系统某一瞬间的全部状态。 */
interface World {
  /** 每部电梯的调度计划（来自 engine）。 */
  plans: CarPlan[]
  /** 每部电梯还剩几拍处于「开门停留」状态；>0 表示门开着、暂不移动。 */
  dwell: number[]
}

export const program: ElevatorProgram = (
  requests$: Observable<ElevatorRequest>,
  ctx,
) => {
  const { cars, msPerFloor, doorMs } = ctx.building
  // 开门停留要换算成「多少拍」：每拍 = 一层的时间。至少停 1 拍。
  const dwellTicks = Math.max(1, Math.round(doorMs / msPerFloor))

  // ---- 初始世界：cars 部电梯都停在 1 层、门关、没有任务。----
  const initialWorld: World = {
    plans: Array.from({ length: cars }, () => initialPlan(ctx.building, 1)),
    dwell: Array.from({ length: cars }, () => 0),
  }

  // ---- 输入清洗（承接 L8）：先去抖，再丢掉「连续重复」的同一个请求。----
  // 去抖：极短时间内的狂点只保留最后一下，避免抖动。
  // 去重：同来源、同楼层、同方向的请求，连着来就只算一次。
  const cleaned$ = requests$.pipe(
    debounceTime(120),
    distinctUntilChanged(
      (a, b) =>
        a.floor === b.floor &&
        a.direction === b.direction &&
        a.source === b.source,
    ),
  )

  // ---- 两条事件流，包装成统一的 Event 再 merge。----
  const reqEvents$: Observable<Event> = cleaned$.pipe(
    map((req): Event => ({ kind: 'req', req })),
  )
  // timer(0, ms)：立刻发一拍，之后每 msPerFloor 发一拍，0,1,2,…
  const tickEvents$: Observable<Event> = timer(0, msPerFloor).pipe(
    map((): Event => ({ kind: 'tick' })),
  )

  return merge(reqEvents$, tickEvents$).pipe(
    // ---- 核心 reducer：每个事件推进「世界」一步（纯函数，无副作用）。----
    scan((world: World, ev: Event): World => {
      if (ev.kind === 'req') {
        // 来了个请求：用 engine.pickCar 选一部最顺路的电梯，把目标楼层并进去。
        const target = ev.req.floor
        const i = pickCar(world.plans, target)
        const plans = world.plans.map((p, idx) =>
          idx === i ? addTarget(p, target) : p,
        )
        return { ...world, plans }
      }

      // 时钟滴答：每部电梯各推进一帧。
      const plans = [...world.plans]
      const dwell = [...world.dwell]
      for (let i = 0; i < plans.length; i++) {
        if (dwell[i] > 0) {
          // 门开着、停留中：这一拍只把倒计时减一，电梯不动。
          dwell[i] -= 1
          continue
        }
        const before = plans[i]
        const after = advance(before)
        plans[i] = after
        // advance 在「脚下这层是目标」时会把它摘掉 —— 这正是一次到站停靠，
        // 于是开门停留 dwellTicks 拍。判定方式：目标数变少了。
        if (after.targets.length < before.targets.length) {
          dwell[i] = dwellTicks
        }
      }
      return { plans, dwell }
    }, initialWorld),

    // ---- 投影：把内部 World 映射成 UI 要的 ElevatorState[]。----
    map((world): ElevatorState[] =>
      world.plans.map((plan, i) =>
        toState(plan, {
          doorsOpen: world.dwell[i] > 0, // 停留中即门开着
          carId: `car-${i + 1}`,
        }),
      ),
    ),
  )
}
