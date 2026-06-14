/**
 * 「可运行的电梯程序」契约。
 *
 * 每一课的核心 RxJS 代码都实现成一个 ElevatorProgram：吃进一条「请求流」，
 * 吐出一条「电梯状态流」。这样所有课程都能复用同一个 <ElevatorRunner>
 * 组件来跑、来点按钮、来看状态，差异只在那几行 RxJS 管道里 —— 这正是
 * 我们想让初学者聚焦的地方。
 */
import type { Observable } from 'rxjs'
import type { BuildingConfig, ElevatorRequest, ElevatorState } from './types'

export interface RunnerContext {
  building: BuildingConfig
}

/**
 * 输入：用户按下的所有请求（大厅呼叫 + 轿厢按钮）组成的流。
 * 输出：电梯状态流。始终用「数组」表示，单电梯就是长度为 1 的数组，
 *       这样单电梯和多电梯（L7）共用一套渲染。
 */
export type ElevatorProgram = (
  requests$: Observable<ElevatorRequest>,
  ctx: RunnerContext,
) => Observable<ElevatorState[]>
