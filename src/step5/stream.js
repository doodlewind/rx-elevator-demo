import { Observable } from 'rxjs'

export function getStream (emitter, type) {
  return Observable
    .fromEvent(emitter, type)
    .switchMap(({ floors, targetFloor, currFloor, currDirection }) => {
      window.alert(JSON.stringify({
        floors, targetFloor, currFloor, currDirection
      }, null, 2))
      const baseFloor = currFloor

      if (targetFloor >= baseFloor) {
        const up = Observable
          .interval(1000)
          .map(count => {
            const newFloor = count + baseFloor
            return {
              floor: newFloor,
              direction: newFloor === targetFloor ? 'stop' : 'up'
            }
          })
          .take(targetFloor + 1 - baseFloor)
        const down = Observable
          .interval(1000)
          .map(count => {
            const newFloor = targetFloor - count
            return {
              floor: newFloor,
              direction: newFloor !== 1 ? 'down' : 'stop'
            }
          })
          .take(targetFloor)
        return up.concat(down)
      } else {
        return Observable
          .interval(1000)
          .map(count => {
            const newFloor = baseFloor - count
            return {
              floor: newFloor,
              direction: newFloor !== 1 ? 'down' : 'stop'
            }
          })
          .take(baseFloor)
      }
    })
}
