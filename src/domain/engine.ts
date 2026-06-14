/**
 * 纯函数版的电梯「物理 + 调度」。
 *
 * 这里没有任何 RxJS —— 只是一组「给定当前状态，算出下一步」的纯函数。
 * 课程后期（L6 之后）用 RxJS 的 scan / timer 把这些纯函数「串成时间上的流」，
 * 这样 RxJS 部分就能聚焦在「编排」，而不被调度细节淹没。
 *
 * 采用的是经典的 LOOK 算法（电梯算法）：朝一个方向一路扫到该方向最远的目标，
 * 再掉头扫另一个方向。
 */
import type { BuildingConfig, Direction, ElevatorState } from './types'

export interface CarPlan {
  /** 当前楼层（整数）。 */
  floor: number
  /** 当前方向。 */
  direction: Direction
  /** 待服务的目标楼层集合。 */
  targets: number[]
}

/** 把一个目标楼层并入计划（去重）。 */
export function addTarget(plan: CarPlan, floor: number): CarPlan {
  if (plan.targets.includes(floor) || floor === plan.floor) return plan
  return { ...plan, targets: [...plan.targets, floor].sort((a, b) => a - b) }
}

/** 在当前方向上，是否还有目标。 */
function hasTargetTowards(plan: CarPlan, dir: Direction): boolean {
  if (dir === 'up') return plan.targets.some((t) => t > plan.floor)
  if (dir === 'down') return plan.targets.some((t) => t < plan.floor)
  return false
}

/**
 * 决定下一步该往哪个方向走（LOOK）：
 * - 沿当前方向若还有目标 → 保持
 * - 否则若反方向有目标 → 掉头
 * - 都没有 → idle
 */
export function nextDirection(plan: CarPlan): Direction {
  const { direction } = plan
  if (direction !== 'idle' && hasTargetTowards(plan, direction)) return direction
  const other: Direction = direction === 'up' ? 'down' : 'up'
  if (hasTargetTowards(plan, other)) return other
  // 静止时，朝最近的目标出发
  if (plan.targets.length) {
    const nearest = plan.targets.reduce((a, b) =>
      Math.abs(b - plan.floor) < Math.abs(a - plan.floor) ? b : a,
    )
    return nearest > plan.floor ? 'up' : 'down'
  }
  return 'idle'
}

/**
 * 推进一步：移动一层（或在到站时摘掉该目标）。返回新的计划。
 * 这是 reducer 的核心 —— 每个「时间帧」调用一次。
 */
export function advance(plan: CarPlan): CarPlan {
  // 先看脚下这层是不是目标：是就停靠（开门），把它摘掉。
  if (plan.targets.includes(plan.floor)) {
    const targets = plan.targets.filter((t) => t !== plan.floor)
    return { ...plan, targets, direction: nextDirection({ ...plan, targets }) }
  }
  const dir = nextDirection(plan)
  if (dir === 'idle') return { ...plan, direction: 'idle' }
  const floor = dir === 'up' ? plan.floor + 1 : plan.floor - 1
  return { floor, direction: dir, targets: plan.targets }
}

/** 计划是否已全部完成。 */
export function isDone(plan: CarPlan): boolean {
  return plan.targets.length === 0
}

/** 把内部 CarPlan 投影成 UI 用的 ElevatorState。 */
export function toState(
  plan: CarPlan,
  opts: { doorsOpen?: boolean; carId?: string } = {},
): ElevatorState {
  return {
    floor: plan.floor,
    direction: plan.direction,
    doors: opts.doorsOpen ? 'open' : 'closed',
    targets: [...plan.targets].sort((a, b) => a - b),
    carId: opts.carId,
  }
}

/** 选出最适合服务某楼层的电梯下标（多电梯调度，L7 用）：简单地取「最近且顺路」。 */
export function pickCar(plans: CarPlan[], floor: number): number {
  let best = 0
  let bestCost = Infinity
  plans.forEach((plan, i) => {
    const distance = Math.abs(plan.floor - floor)
    // 顺路（同方向且在前方）给个折扣，体现真实调度的「捎带」。
    const onTheWay =
      (plan.direction === 'up' && floor >= plan.floor) ||
      (plan.direction === 'down' && floor <= plan.floor) ||
      plan.direction === 'idle'
    const cost = distance + (onTheWay ? 0 : plans.length * 2)
    if (cost < bestCost) {
      bestCost = cost
      best = i
    }
  })
  return best
}

/** 便捷：基于楼栋默认配置造一个初始计划。 */
export function initialPlan(_building?: BuildingConfig, floor = 1): CarPlan {
  return { floor, direction: 'idle', targets: [] }
}
