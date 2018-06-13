import { interval, fromEvent, concat } from 'rxjs'
import { map, take, switchMap } from 'rxjs/operators'

export default function Elevator (emitter, type) {
  return fromEvent(emitter, type).pipe(
    switchMap(({ target, curr }) => {
      if (target >= curr) {
        const up = interval(1000).pipe(
          map(x => x + curr),
          take(target + 1 - curr)
        )
        const down = interval(1000).pipe(
          map(x => target - x),
          take(target)
        )
        return concat(up, down)
      } else {
        return interval(1000).pipe(
          map(x => curr - x),
          take(curr)
        )
      }
    })
  )
}
