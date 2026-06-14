/**
 * L1 · 一个按钮，一条流
 * ----------------------------------------------------------------
 * 最小可运行的电梯：每次点楼层按钮，电梯「瞬间」出现在那一层。
 * 还没有运动，但已经能讲清 RxJS 最核心的一句话：
 *
 *   「按钮的每一次点击，是时间轴上的一个事件；把这些事件连起来，就是一条流。」
 *
 * 新概念：Observable（流）、map（把流里的每个值变成另一个值）、subscribe。
 */
import { map } from 'rxjs'
import type { ElevatorProgram } from '@/domain/runner'
import type { ElevatorState } from '@/domain/types'

export const program: ElevatorProgram = (requests$) =>
  requests$.pipe(
    // requests$ 的每一个元素是一次请求 { floor, direction, source }。
    // 我们用 map 把「一次请求」变成「一帧电梯状态」。
    map((req): ElevatorState[] => [
      {
        floor: req.floor, // 直接把电梯放到目标层（瞬移，先不考虑过程）
        direction: 'idle',
        doors: 'open',
        targets: [],
      },
    ]),
  )
