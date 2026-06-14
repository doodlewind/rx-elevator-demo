/**
 * L4 · 上行还是下行
 * ----------------------------------------------------------------
 * 到现在，电梯只会「去某一层」。但现实里的大厅按钮是带方向的：你在 3 层
 * 按的是 ▲（我要往上）还是 ▼（我要往下）。这一课我们让请求带上方向，
 * 并学会两件事：
 *
 *   (1) 用 filter「挡掉」没意义的请求 —— 比如请求的就是当前这一层，
 *       电梯没必要动；或者电梯正忙、这次请求暂时无效。
 *   (2) 根据「目标层 vs 当前层」的相对位置，构造方向相反的两种子流：
 *       目标在上方 → 一条「上行」子流（direction:'up'，楼层递增）；
 *       目标在下方 → 一条「下行」子流（direction:'down'，楼层递减）。
 *
 * 仍然只服务「单个在途行程」（多请求排队留到 L5）。闭包变量 current 记住
 * 电梯此刻停在哪层，作为下一趟的起点。
 *
 * 新概念：filter（过滤流里不要的值）、同一个 switchMap 里按条件生成不同子流。
 * 用到的操作符：filter, switchMap, timer, map, takeWhile。
 */
import { filter, switchMap, map, takeWhile, timer } from 'rxjs'
import type { ElevatorProgram } from '@/domain/runner'
import type { ElevatorState, Direction } from '@/domain/types'

export const program: ElevatorProgram = (requests$, ctx) => {
  const tickMs = ctx.building.msPerFloor
  let current = 1 // 电梯当前停靠层，下一趟从这里出发

  return requests$.pipe(
    // (1) filter：把「无意义的请求」挡在门外。
    //     请求的就是当前这一层 → 电梯不用动，直接丢弃，连子流都不生成。
    filter((req) => req.floor !== current),

    // (2) switchMap：把每个有效请求，换成一段「随时间到来」的运动子流。
    switchMap((req) => {
      const from = current
      const target = req.floor

      // 关键：根据 target 与 current 的相对位置，决定这是「上行」还是「下行」。
      // 这一个判断，分叉出两条方向、步进都相反的子流。
      const dir: Direction = target > from ? 'up' : 'down'
      const step = dir === 'up' ? 1 : -1

      // timer(0, tickMs)：立刻发第 0 帧，之后每隔 tickMs 发 1,2,3…
      return timer(0, tickMs).pipe(
        map((n): ElevatorState[] => {
          const floor = from + step * n
          const arrived = floor === target
          current = floor // 记账：电梯走到哪，current 就更新到哪
          return [
            {
              floor,
              // 上行段一路是 'up'，下行段一路是 'down'，到站才变 idle
              direction: arrived ? 'idle' : dir,
              doors: arrived ? 'open' : 'closed',
              targets: arrived ? [] : [target],
            },
          ]
        }),
        // 到达目标层时再发最后一帧（开门），然后结束这段子流。
        takeWhile((s) => s[0].floor !== target, true),
      )
    }),
  )
}
