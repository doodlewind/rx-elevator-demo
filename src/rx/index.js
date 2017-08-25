import { Observable } from 'rxjs'

export function getStream (emitter, type) {
  return Observable
    .fromEvent(emitter, type)
    .switchMap(({ floors, targetFloor, currFloor, currDirection }) => {
      console.log(floors)
      console.log(currFloor, currDirection)

      if (targetFloor >= currFloor) {
        const up = Observable
          .interval(1000)
          .map(x => {
            return {
              floor: x + currFloor,
              direction: 'up'
            }
          })
          .take(targetFloor + 1 - currFloor)
        const down = Observable
          .interval(1000)
          .map(x => {
            return {
              floor: targetFloor - x,
              direction: 'down'
            }
          })
          .take(targetFloor)
        return up.concat(down)
      } else {
        return Observable
          .interval(1000)
          .map(x => {
            return {
              floor: currFloor - x,
              direction: currFloor !== 1 ? 'down' : 'stop'
            }
          })
          .take(currFloor)
      }
    })
}
