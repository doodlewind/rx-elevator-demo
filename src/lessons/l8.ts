/**
 * L8 · 真实世界的细节：防抖、去重与时序
 * ----------------------------------------------------------------
 * 真实电梯要面对「人的毛刺操作」：着急的人会把同一个按钮按上五六下，
 * 同一层的呼叫还没服务完又被反复按。如果我们把每一次点击都老老实实地
 * 喂给调度器，targets 里就会塞满重复目标，电梯会被「噪声」带乱。
 *
 * 本课沿用「merge 汇流 + scan 累积状态」的单电梯骨架（和 L6 一致），
 * 但在「请求进入 reducer 之前」加一层**预处理**，把毛刺过滤掉：
 *
 *   requests$
 *     ├─ debounceTime(...)            // 同一阵密集点击，只在「安静下来」后认一次
 *     └─ distinctUntilChanged(...)    // 同一个 (楼层,方向) 没服务完前不重复加入
 *
 * 这样进入调度的，就是一串「干净」的请求。
 *
 * 新概念：时间类操作符
 *   - debounceTime：事件后等一段「安静期」，期间没有新事件才放行（防连点抖动）
 *   - throttleTime：先放行一个，然后冷却一段时间，期间的事件全丢（限流）
 *   - distinctUntilChanged：和「上一个放行的值」相同就跳过（去重）
 *   - delay：把整条流整体往后推迟一点（这里给开门留出时序，可选）
 *
 * 复用：调度逻辑直接用 domain/engine.ts 的纯函数，避免自己写错 LOOK 算法。
 */
import {
  merge,
  timer,
  map,
  scan,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs'
import type { ElevatorProgram } from '@/domain/runner'
import type { ElevatorRequest, ElevatorState } from '@/domain/types'
import {
  type CarPlan,
  addTarget,
  advance,
  initialPlan,
  toState,
} from '@/domain/engine'

/** 同一阵连点的「安静期」：最后一次点击后，再静 200ms 才算数。 */
const DEBOUNCE_MS = 200

/** 给一次请求算一个「身份」字符串，用来判断「是不是同一个呼叫」。 */
function keyOf(req: ElevatorRequest): string {
  return `${req.floor}:${req.direction}`
}

export const program: ElevatorProgram = (requests$, ctx) => {
  const tickMs = ctx.building.msPerFloor

  // ── 预处理：把「人的毛刺」过滤成「干净的请求」 ────────────────────
  const clean$ = requests$.pipe(
    // 1) 防连点抖动：一阵密集点击，只在它「安静下来」后放行最后一个。
    debounceTime(DEBOUNCE_MS),
    // 2) 去重：和上一个放行的请求「身份」相同，就不再重复加入目标。
    distinctUntilChanged((a, b) => keyOf(a) === keyOf(b)),
  )

  // ── 时间节拍：每 tickMs 推进电梯一帧（产出一个 'tick'）。 ──────────
  const tick$ = timer(tickMs, tickMs).pipe(map(() => ({ type: 'tick' as const })))

  // ── merge：把「干净请求」和「时间节拍」汇成同一条流。 ──────────────
  const requestEvents$ = clean$.pipe(
    map((req) => ({ type: 'request' as const, req })),
  )
  const events$ = merge(requestEvents$, tick$)

  // ── scan：用纯函数 reducer 把事件流累积成「电梯计划」的演变。 ───────
  return events$.pipe(
    scan<
      { type: 'request'; req: ElevatorRequest } | { type: 'tick' },
      { plan: CarPlan; arrived: boolean }
    >(
      (acc, ev) => {
        if (ev.type === 'request') {
          // 新请求：把目标并入计划（addTarget 已去重排序）。
          return { plan: addTarget(acc.plan, ev.req.floor), arrived: false }
        }
        // tick：推进一帧。advance 会在到站时摘掉目标。
        const before = acc.plan.targets.length
        const plan = advance(acc.plan)
        // 到站的那一帧（targets 变少了）让门「开」一下。
        const arrived = plan.targets.length < before
        return { plan, arrived }
      },
      { plan: initialPlan(ctx.building), arrived: false },
    ),
    // 投影成 UI 状态：始终是长度 1 的数组（单电梯）。
    map(({ plan, arrived }): ElevatorState[] => [
      toState(plan, { doorsOpen: arrived }),
    ]),
  )
}
