import { Observable } from 'rxjs'

function getMaxTargetFloor (floors) {
  let maxTargetFloor = 0
  for (let i = floors.length - 1; i >= 0; i--) {
    if (floors[i].down) maxTargetFloor = floors.length - i
  }
  return maxTargetFloor
}

export function getStream (emitter, type) {
  return Observable
    .fromEvent(emitter, type)
    .filter(({ floors, targetFloor, currFloor, currDirection }) => {
      if (currDirection === 'down') return false
      else if (currDirection === 'up' && targetFloor <= currFloor) {
        return false
      } else return true
    })
    .switchMap(({ floors, targetFloor, currFloor, currDirection }) => {
      const maxTargetFloor = getMaxTargetFloor(floors)
      const baseFloor = currFloor
      const up = Observable
        .interval(1000)
        .map(count => {
          const newFloor = count + baseFloor
          return { floor: newFloor, direction: 'up' }
        })
        .take(maxTargetFloor + 1 - baseFloor)
      const down = Observable
        .interval(1000)
        .map(count => {
          const newFloor = maxTargetFloor - count
          return {
            floor: newFloor,
            direction: newFloor !== 1 ? 'down' : 'stop'
          }
        })
        .take(maxTargetFloor)
      return up.concat(down)
    })
}
