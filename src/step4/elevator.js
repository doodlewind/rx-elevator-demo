import { interval, fromEvent, concat } from 'rxjs'
import { map, take, switchMap } from 'rxjs/operators'

export default function Elevator (emitter, type) {
  return fromEvent(emitter, type).pipe(
    switchMap(({ floors, targetFloor, currFloor, currDirection }) => {
      window.alert(JSON.stringify({
        floors, targetFloor, currFloor, currDirection
      }, null, 2))
      const baseFloor = currFloor

      if (targetFloor >= baseFloor) {
        const up = interval(1000).pipe(
          map(count => {
            const newFloor = count + baseFloor
            return {
              floor: newFloor,
              direction: newFloor === targetFloor ? 'stop' : 'up'
            }
          }),
          take(targetFloor + 1 - baseFloor)
        )
        const down = interval(1000).pipe(
          map(count => {
            const newFloor = targetFloor - count
            return {
              floor: newFloor,
              direction: newFloor !== 1 ? 'down' : 'stop'
            }
          }),
          take(targetFloor)
        )
        return concat(up, down)
      } else {
        return interval(1000).pipe(
          map(count => {
            const newFloor = baseFloor - count
            return {
              floor: newFloor,
              direction: newFloor !== 1 ? 'down' : 'stop'
            }
          }),
          take(baseFloor)
        )
      }
    })
  )
}
