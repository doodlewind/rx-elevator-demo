/**
 * L2 · 让电梯动起来
 * ----------------------------------------------------------------
 * 电梯不该瞬移。这一课我们让它「一层一层」地挪过去：点 7 层，它从当前层
 * 逐帧上升 …→5→6→7，到了就开门。
 *
 * 关键转变：一次请求不再只产出「一个」状态，而要产出「一串随时间到来」的状态。
 * 能把「一个值」展开成「一条子流」的，正是高阶操作符 switchMap。
 *
 * 新概念：timer / interval（造一条按时间节拍的流）、takeWhile（够了就停）、
 *        switchMap（把每个请求换成一段运动子流）。
 */
import { switchMap, map, takeWhile, timer } from 'rxjs'
import type { ElevatorProgram } from '@/domain/runner'
import type { ElevatorState } from '@/domain/types'

export const program: ElevatorProgram = (requests$, ctx) => {
  const tickMs = ctx.building.msPerFloor
  let current = 1 // 记住电梯停在哪，作为下一趟的起点

  return requests$.pipe(
    switchMap((req) => {
      const from = current
      const target = req.floor
      const dir: ElevatorState['direction'] =
        target > from ? 'up' : target < from ? 'down' : 'idle'
      const step = dir === 'up' ? 1 : -1

      // timer(0, tickMs)：立刻发一下，之后每隔 tickMs 再发，0,1,2,3…
      return timer(0, tickMs).pipe(
        map((n): ElevatorState[] => {
          const floor = dir === 'idle' ? target : from + step * n
          const arrived = floor === target
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
        // 到达目标层后再发最后一帧（开门），然后停止这段子流。
        takeWhile((s) => s[0].floor !== target, true),
      )
    }),
  )
}
