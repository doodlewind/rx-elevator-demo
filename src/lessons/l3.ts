/**
 * L3 · 一次只服务一个请求
 * ----------------------------------------------------------------
 * L2 已经让电梯用 switchMap 一层层地移动。但 switchMap 还有一个我们上一课
 * 没点破的「超能力」：**切换（switch）** —— 它会在新事件到来时，把上一条
 * 还没跑完的内层子流**立刻取消（退订）**。
 *
 * 放到电梯里就是这样一个场景：
 *   电梯正在去 7 层的路上（…→4→5→6 还在爬），这时有人按了 3 层。
 *   switchMap 会一秒都不犹豫地「丢弃」那条去 7 层的子流，
 *   转身追新目标 3 层 —— 哪怕电梯当前正在往上走。
 *
 * 这就是「一次只服务一个请求」：永远只有最新的那条子流是活着的。
 *
 * 实现要点：
 * - 用闭包变量 current 记住电梯**此刻真实所在的层**（每帧更新）。
 * - 新请求进来时，从 current（而不是 1 层）出发，朝 req.floor 逐层移动。
 *   因为 current 是被「上一条子流跑到一半时」更新的，所以即便半路改主意，
 *   也能从电梯当前真实位置接着走，而不会瞬移。
 * - timer(0, tickMs) 提供节拍，map 把每一拍变成一帧 ElevatorState[]，
 *   takeWhile 在到站那一帧停下并开门。
 *
 * 新概念：switchMap 的「切换 / 取消」语义（旧子流被新事件截断、退订）。
 * 主要操作符：switchMap、timer、map、takeWhile。
 */
import { switchMap, map, takeWhile, timer } from 'rxjs'
import type { ElevatorProgram } from '@/domain/runner'
import type { ElevatorState } from '@/domain/types'

export const program: ElevatorProgram = (requests$, ctx) => {
  const tickMs = ctx.building.msPerFloor
  // current 记住电梯「此刻真实在哪一层」。它会在每一帧被更新，
  // 所以下一个请求总能从电梯当前位置接着出发 —— 这是「半路改目标不瞬移」的关键。
  let current = 1

  return requests$.pipe(
    // switchMap：每来一个请求，就开一条「去目标层」的子流。
    // 一旦下一个请求到来，上一条子流会被 switchMap 立刻退订 —— 旧行程被丢弃。
    switchMap((req) => {
      const target = req.floor
      // 注意：from 取的是 current（电梯此刻的真实位置），不是固定的 1 层。
      const from = current
      const dir: ElevatorState['direction'] =
        target > from ? 'up' : target < from ? 'down' : 'idle'
      const step = dir === 'up' ? 1 : dir === 'down' ? -1 : 0

      // timer(0, tickMs)：第 0 帧立刻发一下，之后每隔 tickMs 发一个递增的 n（0,1,2…）。
      return timer(0, tickMs).pipe(
        map((n): ElevatorState[] => {
          // 从 from 出发，每过一拍朝目标挪一层；同层请求则直接停在目标。
          const floor = dir === 'idle' ? target : from + step * n
          const arrived = floor === target
          // 每一帧都把真实位置写回 current。
          // 万一这条子流半路被取消，current 也已停在「被打断的那一层」，
          // 下一个请求就能从这里继续，而不是从 1 层重新算。
          current = floor
          return [
            {
              floor,
              direction: arrived ? 'idle' : dir,
              doors: arrived ? 'open' : 'closed',
              targets: arrived ? [] : [target],
            },
          ]
        }),
        // 到达目标层后再发这最后一帧（开门），然后让子流自然结束。
        takeWhile((s) => s[0].floor !== target, true),
      )
    }),
  )
}
