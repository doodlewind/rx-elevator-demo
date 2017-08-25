import { Observable } from 'rxjs'

export function getStream (emitter, type) {
  return Observable
    .fromEvent(emitter, type)
    .switchMap(({ targetFloor, currFloor }) => {
      if (targetFloor >= currFloor) {
        const up = Observable
          .interval(1000)
          .map(x => x + currFloor)
          .take(targetFloor + 1 - currFloor)
        const down = Observable
          .interval(1000)
          .map(x => targetFloor - x)
          .take(targetFloor)
        return up.concat(down)
      } else {
        return Observable
          .interval(1000)
          .map(x => currFloor - x)
          .take(currFloor)
      }
    })
}
