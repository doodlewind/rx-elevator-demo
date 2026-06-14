/**
 * L6 · SCAN 调度算法：reducer 即状态机
 * ----------------------------------------------------------------
 * L5 我们搭好了「merge + scan」的骨架：
 *   - merge 把「请求流」和「心跳流（timer）」汇成一条流；
 *   - scan 像一个累加器，拿「上一帧状态」和「这一帧事件」算出「这一帧新状态」。
 *
 * 这一课我们钻进 scan 的 reducer 内部，把它真正变成一个「电梯状态机」：
 *
 *   1) 来了一个「请求」事件 → 把目标楼层并进计划（engine.addTarget）。
 *   2) 来了一个「心跳」事件 → 让电梯推进一帧（engine.advance）。
 *      推进用的就是经典 LOOK 算法：朝一个方向一路扫到底，途中顺路的目标
 *      一并服务，扫完再掉头。这套规则全藏在 engine.advance / nextDirection 里。
 *
 * 新增的细节：「到站开门停留」。电梯到一层不能立刻又走，得停几帧让人上下。
 * 我们给 reducer 的状态包一层壳：
 *
 *   interface CarRuntime { plan: CarPlan; dwell: number; doorsOpen: boolean }
 *
 *   - 到站（advance 把某个目标摘掉）那一刻：设 dwell = N 帧、doorsOpen = true。
 *   - 之后每个心跳：只要 dwell > 0，就原地停留、dwell--，不移动（门开着）。
 *   - dwell 归零：关门，恢复正常 advance。
 *
 * N（停留几帧）由 doorMs / msPerFloor 算出：开关门耗时相当于几个「楼层节拍」。
 *
 * 用到的操作符：merge、timer、scan、map、distinctUntilChanged。
 */
import { merge, timer, scan, map, distinctUntilChanged } from 'rxjs'
import type { Observable } from 'rxjs'
import type { ElevatorProgram, RunnerContext } from '@/domain/runner'
import type { ElevatorRequest, ElevatorState } from '@/domain/types'
import { sameState } from '@/domain/types'
import type { CarPlan } from '@/domain/engine'
import { addTarget, advance, initialPlan, isDone, toState } from '@/domain/engine'

/** scan 累加器里真正流动的「运行时状态」：计划 + 开门停留倒计时。 */
interface CarRuntime {
  plan: CarPlan
  /** 还要在本层停留几帧（门开着、不移动）。 */
  dwell: number
  /** 门此刻是否开着。 */
  doorsOpen: boolean
}

/**
 * merge 进来的两类事件，用一个「带标签」的联合类型区分：
 * - 'request'：用户按了某个楼层；
 * - 'tick'：时间又走了一帧，该推进电梯了。
 */
type Event =
  | { kind: 'request'; req: ElevatorRequest }
  | { kind: 'tick' }

export const program: ElevatorProgram = (
  requests$: Observable<ElevatorRequest>,
  ctx: RunnerContext,
): Observable<ElevatorState[]> => {
  const { msPerFloor, doorMs } = ctx.building

  // 开关门要停留几帧？把门耗时换算成「楼层节拍」的整数倍，至少停 1 帧。
  const dwellFrames = Math.max(1, Math.round(doorMs / msPerFloor))

  // 心跳流：每隔一个「楼层节拍」发一次，催电梯推进一帧。
  const tick$ = timer(msPerFloor, msPerFloor)

  // 两条流汇成一条「事件流」，先各自打上标签，scan 才好分别处理。
  const events$: Observable<Event> = merge(
    requests$.pipe(map((req): Event => ({ kind: 'request', req }))),
    tick$.pipe(map((): Event => ({ kind: 'tick' }))),
  )

  const seed: CarRuntime = { plan: initialPlan(ctx.building, 1), dwell: 0, doorsOpen: false }

  return events$.pipe(
    // ★ reducer 即状态机：拿「上一帧运行时状态」+「这一帧事件」→「新状态」。
    scan((state: CarRuntime, ev: Event): CarRuntime => {
      // 1) 请求事件：只把目标并进计划，不移动（移动交给心跳）。
      if (ev.kind === 'request') {
        return { ...state, plan: addTarget(state.plan, ev.req.floor) }
      }

      // 2) 心跳事件：
      // 2a) 正在开门停留 → 原地等，倒计时减一；归零这帧把门关上。
      if (state.dwell > 0) {
        const dwell = state.dwell - 1
        return { ...state, dwell, doorsOpen: dwell > 0 }
      }

      // 2b) 没有目标 → 静止，什么也不做。
      if (isDone(state.plan)) {
        return { ...state, doorsOpen: false }
      }

      // 2c) 按 LOOK 算法推进一帧。advance 内部：脚下是目标就停靠摘除，
      //     否则朝当前方向（扫不到了才掉头）移动一层。
      const before = state.plan.targets.length
      const plan = advance(state.plan)
      const arrived = plan.targets.length < before // 这一帧摘掉了目标 = 到站了

      if (arrived) {
        // 到站：开门，并设置停留倒计时。
        return { plan, dwell: dwellFrames, doorsOpen: true }
      }
      // 只是路过/移动一层：门关着继续走。
      return { plan, dwell: 0, doorsOpen: false }
    }, seed),

    // 把内部运行时状态投影成 UI 要的 ElevatorState（始终是长度 1 的数组）。
    map((state: CarRuntime): ElevatorState[] => [
      toState(state.plan, { doorsOpen: state.doorsOpen }),
    ]),

    // 相邻两帧若「看起来一样」就不重复发，避免 UI 抖动。
    distinctUntilChanged((a, b) => sameState(a[0], b[0])),
  )
}
