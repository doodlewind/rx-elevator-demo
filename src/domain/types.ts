/**
 * 电梯领域模型 —— 全站共享的契约。
 *
 * 所有课程（lessons/）、可视化组件（components/）与 playground 都围绕这一组
 * 类型工作。它刻意保持「贫血」：只描述数据形状，不含调度逻辑，调度逻辑用
 * RxJS 在各课中逐步构建，这样才能把「思维模型」一层层讲清楚。
 */

/** 电梯运行方向。idle 表示停在某层、没有任务。 */
export type Direction = 'up' | 'down' | 'idle'

/** 轿厢门的状态。 */
export type DoorState = 'open' | 'opening' | 'closing' | 'closed'

/**
 * 一次「请求」。现实里有两种来源：
 * - hall：楼层大厅的上/下按钮（我想从 X 层往某个方向走）
 * - car：轿厢内的楼层按钮（我要去 X 层）
 */
export type RequestSource = 'hall' | 'car'

export interface ElevatorRequest {
  /** 目标 / 发起楼层（1 表示一层）。 */
  floor: number
  /** 期望方向；car 请求通常为 idle（去了再说）。 */
  direction: Direction
  /** 请求来源。 */
  source: RequestSource
  /** 逻辑时间戳（虚拟时间或毫秒），用于排序与回放，可选。 */
  at?: number
}

/**
 * 某一瞬间，一部电梯的完整状态。课程里的 RxJS 流，最终都在产出
 * 这样的快照序列 —— UI 只需订阅它即可渲染。
 */
export interface ElevatorState {
  /** 当前所在楼层（可为小数表示运动中的插值，渲染更顺滑）。 */
  floor: number
  /** 当前方向。 */
  direction: Direction
  /** 门的状态。 */
  doors: DoorState
  /** 还未完成的目标楼层集合（升序无要求，渲染时自行排序）。 */
  targets: number[]
  /** 该部电梯的标识，用于多电梯（L7）。 */
  carId?: string
}

/** 整栋楼的配置。 */
export interface BuildingConfig {
  /** 楼层数。 */
  floors: number
  /** 电梯数量。 */
  cars: number
  /** 每层运行耗时（毫秒，虚拟时间）。 */
  msPerFloor: number
  /** 开关门停留耗时（毫秒，虚拟时间）。 */
  doorMs: number
}

export const DEFAULT_BUILDING: BuildingConfig = {
  floors: 10,
  cars: 1,
  msPerFloor: 1000,
  doorMs: 1500,
}

/** 一个初始静止状态的便捷构造器。 */
export function idleState(floor = 1, carId?: string): ElevatorState {
  return { floor, direction: 'idle', doors: 'closed', targets: [], carId }
}

/** 判断两个状态是否「视觉上相同」，便于 distinctUntilChanged。 */
export function sameState(a: ElevatorState, b: ElevatorState): boolean {
  return (
    a.floor === b.floor &&
    a.direction === b.direction &&
    a.doors === b.doors &&
    a.carId === b.carId &&
    a.targets.length === b.targets.length &&
    a.targets.every((t, i) => t === b.targets[i])
  )
}
