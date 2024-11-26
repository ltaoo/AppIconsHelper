/**
 * @file 纯粹的坐标点
 */
import { base, Handler } from "@/domains/base";
import { BezierPoint } from "@/biz/bezier_point";

enum Events {
  Move,
}
type TheTypesOfEvents = {
  [Events.Move]: { x: number; y: number; dx: number; dy: number };
};
type PointProps = {
  x: number;
  y: number;
  type: PointType;
};
export enum PointType {
  /** 锚点，改变线条位置 */
  Anchor,
  /** 控制点，改变线条曲率 */
  Control,
}
export function Point(props: PointProps) {
  const { x, y, type  } = props;

  let _x = x;
  let _y = y;
  let _start: null | { x: number; y: number } = null;
  let _type = type;
  let _selected = false;
  let _highlighted = false;

  const _state = {
    x: _x,
    y: _y,
    selected: false,
  };
  const bus = base<TheTypesOfEvents>();

  return {
    SymbolTag: "Point" as const,
    get x() {
      return _x;
    },
    get y() {
      return _y;
    },
    get pos() {
      return {
        x: _x,
        y: _y,
      };
    },
    get type() {
      return _type;
    },
    get state() {
      return _state;
    },
    get selected() {
      return _selected;
    },
    select() {
      _selected = true;
    },
    unselect() {
      _selected = false;
    },
    get highlighted() {
      return _selected;
    },
    setHighlight(v: boolean) {
      _highlighted = v;
    },
    // setXY(x: number, y: number, options: Partial<{ silence: boolean }> = {}) {
    //   _x = x;
    //   _y = y;
    //   if (!options.silence) {
    //     bus.emit(Events.Move, { x, y, dx, dy });
    //   }
    // },
    setXY(pos: { x: number; y: number }) {
      const { x, y } = pos;
      _x = x;
      _y = y;
    },
    /** 移动到指定坐标 */
    moveTo(pos: { x: number; y: number }, options: Partial<{ silence: boolean }> = {}) {
      const { x, y } = pos;
      const dx = x - _x;
      const dy = y - _y;
      _x = x;
      _y = y;
      if (options.silence) {
        return;
      }
      bus.emit(Events.Move, { x, y, dx, dy });
    },
    startMove(pos: { x: number; y: number }) {
      _start = {
        x: _x,
        y: _y,
      };
    },
    move(distance: { x: number; y: number }, options: Partial<{ silence: boolean }> = {}) {
      const { x, y } = distance;
      if (!_start) {
        return;
      }
      _x = _start.x + x;
      _y = _start.y + y;
      if (options.silence) {
        return;
      }
      bus.emit(Events.Move, { x: _x, y: _y, dx: x, dy: y });
    },
    finishMove(pos: { x: number; y: number }) {
      _start = null;
    },
    onMove(handler: Handler<TheTypesOfEvents[Events.Move]>) {
      return bus.on(Events.Move, handler);
    },
  };
}

export type Point = ReturnType<typeof Point>;
