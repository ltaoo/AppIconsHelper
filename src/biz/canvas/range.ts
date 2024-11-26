import { base, Handler } from "@/domains/base";

import { Position, RectShape } from "./types";
import { createEmptyRectShape } from "./utils";
import { CanvasPointer } from "./mouse";

type CanvasRangeSelectionProps = {
  pointer: CanvasPointer;
};
/**
 * 画布上框选逻辑
 */
export function CanvasRangeSelection(props: CanvasRangeSelectionProps) {
  const { pointer: _$pointer } = props;

  let _isPressing = false;
  let _isRangeSelecting = false;
  let _rangeStartPosition: null | Position = null;
  /** 选框信息，位置、大小等 */
  let _rangeSelection = createEmptyRectShape();
  const _state = {
    get x() {
      return _rangeSelection.x;
    },
    get y() {
      return _rangeSelection.y;
    },
    get x1() {
      return _rangeSelection.x + _rangeSelection.width;
    },
    get y1() {
      return _rangeSelection.y + _rangeSelection.height;
    },
  };

  enum Events {
    Change,
  }
  type TheTypesOfEvents = {
    [Events.Change]: typeof _state;
  };
  const bus = base<TheTypesOfEvents>();

  return {
    SymbolTag: "CanvasRange",
    state: _state,
    /**
     * 开始框选
     */
    startRangeSelect(pos: Position) {
      // console.log("[BIZ]canvas/range - startRangeSelect", _isPressing);
      _rangeStartPosition = pos;
    },
    /**
     * 框选
     */
    rangeSelect(pos: Position) {
      const { x, y } = pos;
      // console.log("[BIZ]canvas/range - rangeSelect", x, y, _$pointer.dragging);
      if (_rangeStartPosition === null) {
        return;
      }
      if (!_$pointer.dragging) {
        return;
      }
      if (_isRangeSelecting === false) {
        // @todo 可以判断下移动的距离，如果小于某个阈值，就不算
        _isRangeSelecting = true;
      }
      // if (this.client === null) {
      //   const errMsg = "[DOMAIN]Canvas - rangeSelect 请先调用 updateBoundingClientRect 更新画布尺寸、位置信息";
      //   console.warn(errMsg);
      //   return this;
      // }
      const rectInfo = {
        left: 0,
        top: 0,
      };
      const parentRect = {
        left: rectInfo.left,
        top: rectInfo.top,
      };
      const startPos = _rangeStartPosition;
      const payload = Object.assign(createEmptyRectShape(), {
        x: x > startPos.x ? startPos.x - parentRect.left : x - parentRect.left,
        y: y > startPos.y ? startPos.y - parentRect.top : y - parentRect.top,
        x1: x,
        y1: y,
        width: Math.abs(x - startPos.x),
        height: Math.abs(y - startPos.y),
      });
      _rangeSelection = payload;
      //       this.emitter.emit("updateRangeSelection", payload);
      //       const { things } = this.values;
      //       const selectedThings = checkInSelectionRange(payload, things);
      // console.log("[DOMAIN]Canvas - rangeSelect", selectedContents);
      // @todo 其实这里也可以给外部决定哪些能「选中」
      //       this.selectThings(selectedThings.map((content) => content.id));
      // console.log("[BIZ]canvas/range - rangeSelect", _state.x, _state.y);
      bus.emit(Events.Change, { ..._state });
    },
    /**
     * 结束框选
     */
    endRangeSelect() {
      // console.log("[BIZ]canvas/range - endRangeSelect", _isRangeSelecting);
      if (_isRangeSelecting === false) {
        return;
      }
      _isRangeSelecting = false;
      _rangeStartPosition = null;
      _rangeSelection = createEmptyRectShape();
      bus.emit(Events.Change, { ..._state });
    },
    clear() {
      _isRangeSelecting = false;
      _rangeStartPosition = null;
      _rangeSelection = createEmptyRectShape();
      bus.emit(Events.Change, { ..._state });
    },
    onChange(handler: Handler<TheTypesOfEvents[Events.Change]>) {
      return bus.on(Events.Change, handler);
    },
  };
}

export type CanvasRangeSelection = ReturnType<typeof CanvasRangeSelection>;
