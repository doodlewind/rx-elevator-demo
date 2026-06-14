/**
 * 弹珠图（marble diagram）的声明式数据契约。
 *
 * MarbleDiagram.vue 消费这些类型来渲染一条「时间轴上的事件流」，并支持
 * 用一个「播放头（cursor）」做 step-by-step 的逐帧讲解。课程文档里大量
 * 使用它来把抽象的操作符变换「画」出来。
 */

export type MarbleKind = 'next' | 'error' | 'complete'

export interface MarbleEvent {
  /** 事件发生的时间，单位是「帧」（frame）。0 表示订阅时刻。 */
  time: number
  /** 展示在弹珠里的内容；通常是楼层号、方向箭头或短字符串。 */
  value?: string | number
  /** 事件类型，默认 next。 */
  kind?: MarbleKind
  /** 可选颜色覆盖（CSS 颜色），用于强调某些弹珠。 */
  color?: string
  /** 可选的悬浮提示文案。 */
  tip?: string
}

export interface MarbleStream {
  /** 流的名称，渲染在左侧，如 "按钮点击" / "switchMap"。 */
  label?: string
  /** 该流上的事件序列。 */
  events: MarbleEvent[]
  /**
   * 该流是否代表一个「操作符」（画在变换箭头下方），
   * 仅影响样式，可选。
   */
  isOperator?: boolean
}

export interface MarbleSpec {
  /** 自上而下的若干条流。 */
  streams: MarbleStream[]
  /** 时间轴总长度（帧）。不填则按事件自动推断。 */
  frames?: number
  /** 每帧对应的像素宽度，控制疏密，默认 44。 */
  frameWidth?: number
}

/**
 * 把 RxJS 风格的弹珠字符串（如 "--a--b---|"）解析成事件序列，方便在文档里
 * 用最少的代码写出一条流。约定：
 *   '-'  表示一帧的「无事发生」
 *   字符  表示一次 next，value 即该字符
 *   '|'  表示 complete
 *   '#'  表示 error
 *   '(ab)' 表示同一帧内连续多次发射
 */
export function parseMarbles(marbles: string): MarbleEvent[] {
  const events: MarbleEvent[] = []
  let frame = 0
  let inGroup = false
  let groupFrame = 0
  for (let i = 0; i < marbles.length; i++) {
    const c = marbles[i]
    switch (c) {
      case '-':
      case ' ':
        if (!inGroup) frame++
        break
      case '(':
        inGroup = true
        groupFrame = frame
        break
      case ')':
        inGroup = false
        frame++
        break
      case '|':
        events.push({ time: inGroup ? groupFrame : frame, kind: 'complete' })
        if (!inGroup) frame++
        break
      case '#':
        events.push({ time: inGroup ? groupFrame : frame, kind: 'error' })
        if (!inGroup) frame++
        break
      default:
        events.push({ time: inGroup ? groupFrame : frame, value: c, kind: 'next' })
        if (!inGroup) frame++
    }
  }
  return events
}
