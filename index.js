import { Point } from 'pixi.js'
import Hammer from 'hammerjs'

function debounce(func, wait, maxWait) {
  let lastThis = null
  let lastArgs = null
  let lastCallTime
  let startTime
  let timeId
  function startTimer() {
    return setTimeout(function () {
      func.apply(lastThis, lastArgs)
      lastThis = null
      lastArgs = null
      lastCallTime = undefined
      startTime = undefined
      timeId = undefined
    }, wait)
  }
  return function (...args) {
    lastThis = this
    lastArgs = args
    let currentTime = Date.now()
    if (timeId) {
      if (currentTime - startTime < maxWait && currentTime - lastCallTime < wait) {
        lastCallTime = currentTime
        clearTimeout(timeId)
        timeId = startTimer()
      }
    } else {
      lastCallTime = currentTime
      startTime = currentTime
      timeId = startTimer()
    }
  }
}
export default class PixiHammer extends Hammer.Manager {
  interactionManager = null
  firstTarget = null
  registeredEventTypes = []
  basicEventSuffixs = {
    'tap': [''],
    'pan': ['', 'start', 'move', 'end', 'cancel', 'left', 'right', 'up', 'down'],
    'pinch': ['', 'start', 'move', 'end', 'cancel', 'in', 'out'],
    'press': ['', 'up'],
    'rotate': ['', 'start', 'move', 'end', 'cancel'],
    'swipe': ['', 'left', 'right', 'up', 'down']
  }
  _bindListeners = null
  _unbindListeners = null

  constructor(canvas, interactionManager, options = {}) {
    super(canvas, Object.assign({}, Hammer.defaults, options, { recognizers: [] }))
    this.interactionManager = interactionManager;

    // 内部防抖
    this._bindListeners = debounce(this.bindListeners, 500, 5000)
    this._unbindListeners = debounce(this.unbindListeners, 500, 5000)

    const recognizers = options.recognizers || Hammer.defaults.preset
    recognizers.forEach(item => {
      let recognizer = this.add(new (item[0])(item[1]));
      item[2] && recognizer.recognizeWith(item[2]);
      item[3] && recognizer.requireFailure(item[3]);
    });
    this.on('hammer.input', (ev) => {
      // TODO:对于多点触控事件，isFirst是指哪一点，press转pinch会重复执行这一步？
      if (ev.isFirst) {
        this.firstTarget = this.getPixiTarget(ev.center);
      }
      // 对于tap事件，它在isFinal=true时触发，不能清空，
      // if (ev.isFinal) {
      //   firstTarget = null;
      // }
    });
  }
  decorateEvent(eventName) {
    return `hammer-${eventName}`
  }
  normalizePoint(dstPoint) {
    let pt = new Point();
    this.interactionManager.mapPositionToPoint(pt, dstPoint.x, dstPoint.y);
    return pt;
  }
  connect = (ev) => {
    let pixiTarget = this.firstTarget;
    let copyEv = Object.assign({}, ev, {
      stopped: false,
      stopPropagation() {
        this.stopped = true
      }
    })
    copyEv.stopPropagation = copyEv.stopPropagation.bind(copyEv)
    // bubble phase冒泡
    // pixi内部调用事件listener是同步的，可通过循环控制事件传递
    while (pixiTarget && !copyEv.stopped) {
      // 跳过未开启交互的PIXI对象
      pixiTarget.interactive && this.interactionManager.dispatchEvent(pixiTarget, this.decorateEvent(copyEv.type), copyEv);
      pixiTarget = pixiTarget.parent;
    }
  }
  bindListeners() {
    const currentEventTypes = this.getAllEventTypes()
    const filteredTypes = currentEventTypes.filter(currentType => {
      return !this.registeredEventTypes.includes(currentType)
    })

    filteredTypes.forEach(type => {
      this.on(type, this.connect)
    })
    this.registeredEventTypes.push(...filteredTypes)
  }
  unbindListeners() {
    const currentEventTypes = this.getAllEventTypes()

    const retainedTypes = []
    const removedTypes = []

    this.registeredEventTypes.forEach(type => {
      if (currentEventTypes.includes(type)) {
        retainedTypes.push(type)
      } else {
        removedTypes.push(type)
      }
    })
    // unbind from hammer.manager
    removedTypes.forEach(type => {
      this.off(type, this.connect)
    })
    this.registeredEventTypes = retainedTypes
  }
  add(...args) {
    const result = super.add(...args)
    this._bindListeners()
    return result
  }
  getAllEventTypes() {
    return this.recognizers.reduce((result, recognizer) => {
      const protoEvent = recognizer.defaults.event
      const customEvent = recognizer.options.event
      const suffixs = this.basicEventSuffixs[protoEvent]
      for (let suffix of suffixs) {
        result.push(customEvent + suffix)
      }
      return result
    }, [])
  }
  remove(...args) {
    const result = super.remove(...args)
    this._unbindListeners()
    return result
  }
  getPixiTarget(center) {
    const newCenter = this.normalizePoint(center);
    return this.interactionManager.hitTest(newCenter);
  }
  destroy() {
    super.destroy();
    this._bindListeners = null
    this._unbindListeners = null
    this.interactionManager = null
    this.firstTarget = null
    this.registeredEventTypes = []
  }
}
