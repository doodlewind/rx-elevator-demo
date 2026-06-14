/**
 * L7 · 多部电梯协同
 * ----------------------------------------------------------------
 * 一栋楼里不止一部电梯。当大厅有人按下呼叫，问题就从「电梯怎么走」升级成
 * 「派哪一部去」—— 这正是真实电梯系统每天在做的事（dispatching / 派单）。
 *
 * 思维模型的关键一步：
 *   单电梯时，状态是一个 CarPlan；
 *   多电梯时，状态是 CarPlan[]（一栋楼里所有电梯的计划）。
 *
 * 我们沿用 L6 的套路：用 merge 把「时间节拍 tick」和「用户请求 add」合成同一条
 * 事件流，再用 scan 维护「整栋楼的状态」这唯一一份累加器。reducer 里：
 *   - 收到 add：用 engine.pickCar 选出最合适的那一部电梯，只给它 addTarget；
 *   - 收到 tick：让所有电梯各自 advance 一帧。
 * 最后 map 成 ElevatorState[]，每部电梯带上自己的 carId（'#1'、'#2'…）。
 *
 * 一句话：多电梯 = 把「一条请求流」派发到「多条子状态」，再把它们合并回「一条状态流」。
 *
 * 主要操作符：merge（合流）、timer（造节拍）、scan（随时间累加状态）、map（投影成 UI 状态）。
 * 概念上还会提到 groupBy / partition —— 它们能把一条流「按 key 拆成多条」，
 * 但这里我们用 pickCar 在 reducer 内手动派单，更直观也更贴近真实调度。
 */
import { merge, timer, scan, map } from 'rxjs'
import type { ElevatorProgram } from '@/domain/runner'
import type { ElevatorState } from '@/domain/types'
import { addTarget, advance, pickCar, type CarPlan } from '@/domain/engine'

/** 合流后，流上跑的是这两种事件之一。 */
type Tick = { kind: 'tick' }
type Add = { kind: 'add'; floor: number }
type Event = Tick | Add

export const program: ElevatorProgram = (requests$, ctx) => {
  const { cars, msPerFloor } = ctx.building

  // 整栋楼的初始状态：cars 部电梯，起始楼层错开一点，画面更好看也更真实。
  const initial: CarPlan[] = Array.from({ length: cars }, (_, i) => ({
    floor: 1 + i * 2, // #1 在 1 层、#2 在 3 层、#3 在 5 层…
    direction: 'idle' as const,
    targets: [],
  }))

  // 一条恒定的「时间节拍」流：每隔 msPerFloor 毫秒发一个 tick，推动所有电梯前进一帧。
  const ticks$ = timer(msPerFloor, msPerFloor).pipe(map((): Event => ({ kind: 'tick' })))

  // 把「用户请求」也包装成同形状的事件。
  const adds$ = requests$.pipe(map((req): Event => ({ kind: 'add', floor: req.floor })))

  // merge：把两条流合成一条，谁先来就先处理谁。
  return merge(ticks$, adds$).pipe(
    // scan 是「带记忆的 reduce」：plans 是整栋楼上一刻的状态，event 是这一刻的事件。
    scan((plans: CarPlan[], event: Event): CarPlan[] => {
      if (event.kind === 'add') {
        // 派单：在所有电梯里挑一部最合适的，只更新它，其余原样保留。
        const chosen = pickCar(plans, event.floor)
        return plans.map((plan, i) => (i === chosen ? addTarget(plan, event.floor) : plan))
      }
      // tick：所有电梯各自推进一帧。
      return plans.map((plan) => advance(plan))
    }, initial),
    // 把整栋楼的内部计划，投影成一排 UI 状态，每部带上 carId。
    map((plans): ElevatorState[] =>
      plans.map((plan, i) => ({
        floor: plan.floor,
        direction: plan.direction,
        // 脚下这层正是某个目标 ⇒ 刚到站，开门。
        doors: plan.targets.includes(plan.floor) ? 'open' : 'closed',
        targets: [...plan.targets].sort((a, b) => a - b),
        carId: `#${i + 1}`,
      })),
    ),
  )
}
