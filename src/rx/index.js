import { Observable } from 'rxjs'

export function getStream (emitter, type) {
  return Observable
    .fromEvent(emitter, type)
    .switchMap(({ target, curr }) => {
      const up = Observable
        .interval(1000)
        .map(x => x + 1)
        .take(target)
      const down = Observable
        .interval(1000)
        .map(x => target - x)
        .take(target)
      return up.concat(down)
    })
}
