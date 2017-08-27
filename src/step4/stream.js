import { Observable } from 'rxjs'

export function getStream (emitter, type) {
  return Observable
    .fromEvent(emitter, type)
    .switchMap(({ targetFloor, currFloor }) => {
      if (targetFloor >= currFloor) {
        const up = Observable
          .interval(1000)
          .map(x => ({
            floor: x + currFloor,
            direction: 'up'
          }))
          .take(targetFloor + 1 - currFloor)
        const down = Observable
          .interval(1000)
          .map(x => ({
            floor: targetFloor - x,
            direction: 'down'
          }))
          .take(targetFloor)
        return up.concat(down)
      } else {
        return Observable
          .interval(1000)
          .map(x => ({
            floor: currFloor - x,
            direction: 'down'
          }))
          .take(currFloor)
      }
    })
}
