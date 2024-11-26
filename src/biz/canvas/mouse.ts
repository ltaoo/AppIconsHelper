import { base, Handler } from "@/domains/base";
import { CircleCurved, BezierPoint, BezierPointMirrorTypes } from "@/biz/bezier_point";
import {
  calculateCircleCenter,
  getSymmetricPoint2,
  isCollinear,
  toBase64,
  calculateCircleArcs,
  findSymmetricPoint,
  distanceOfPoints,
  arc_to_curve,
  checkIsClockwise,
} from "@/biz/bezier_point/utils";
import { LinePath } from "@/biz/path";
import { LineCapType, LineJoinType, PathCompositeOperation } from "@/biz/line";
import { Point } from "@/biz/point";
import { Line } from "@/biz/line";

import { Canvas } from "./index";
import { CanvasModeManage } from "./mode";

/**
 * 画布上鼠标相关逻辑
 * 是否按下、移动距离等等
 */
export function CanvasPointer(props: { canvas: Canvas; mode: CanvasModeManage }) {
  const { canvas: _$canvas, mode: _$mode } = props;
  let _lines: Line[] = [];
  let _paths = _lines.reduce((prev, cur) => {
    return prev.concat(cur.paths);
  }, [] as LinePath[]);
  let _points: Point[] = [];
  let _path_points: BezierPoint[] = [];

  /** 按下时的位置 */
  let _mx = 0;
  let _my = 0;
  let _cx = 0;
  let _cy = 0;
  let _ox = 0;
  let _oy = 0;
  /** 移动时的位置 */
  let _mx2 = 0;
  let _my2 = 0;

  let _pressing = false;
  /** 当前是否处于拖动 */
  let _dragging = false;
  let _timer: null | NodeJS.Timer = null;
  let _timer2: null | NodeJS.Timer = null;
  let _click_count = 0;
  let _out_grid = true;

  function updatePoints() {
    const points: Point[] = [];
    const path_points: BezierPoint[] = [];
    for (let i = 0; i < _paths.length; i += 1) {
      const path = _paths[i];
      points.push(...path.points);
      path_points.push(...path.path_points);
    }
    _points = points;
    // console.log("_points count", _points.length);
    _path_points = path_points;
    // console.log("_path_points count", _path_points.length);
  }

  enum Events {
    PointerDown,
    PointerMove,
    PointerUp,
    Click,
    DoubleClick,
    LongPress,
    LeaveGrid,
    EnterGrid,
    Update,
  }
  type TheTypesOfEvents = {
    [Events.PointerDown]: void;
    [Events.PointerMove]: void;
    [Events.PointerUp]: void;
    [Events.Click]: { x: number; y: number };
    [Events.DoubleClick]: { x: number; y: number };
    [Events.LongPress]: { x: number; y: number };
    [Events.LeaveGrid]: void;
    [Events.EnterGrid]: void;
    [Events.Update]: void;
  };
  const bus = base<TheTypesOfEvents>();

  return {
    get pressing() {
      return _pressing;
    },
    get dragging() {
      return _dragging;
    },
    //     getCurPath() {
    //       return _cur_line_path;
    //     },
    getMousePoint() {
      return {
        x: _mx2,
        y: _my2,
        // text: `${_mx2 - _grid.x},${_my2 - _grid.y}`,
        text: `${_mx2},${_my2}`,
      };
    },
    handleMouseDown(pos: { x: number; y: number }) {
      _mx = pos.x;
      _my = pos.y;
      _pressing = true;
      _click_count += 1;
      _timer = setTimeout(() => {
        if (!_pressing && _click_count === 1) {
          bus.emit(Events.Click, pos);
        }
        _click_count = 0;
        _timer = null;
      }, 300);
      _timer2 = setTimeout(() => {
        // _click_count = 0;
        // _timer = null;
        if (_pressing && !_dragging) {
          bus.emit(Events.LongPress, pos);
        }
      }, 600);
      bus.emit(Events.PointerDown);
    },
    handleMouseMove(pos: { x: number; y: number }) {
      const { x, y } = pos;
      _mx2 = x;
      _my2 = y;
      const in_grid = _$canvas.inGrid(pos);
      if (!in_grid) {
        if (_out_grid === false) {
          bus.emit(Events.LeaveGrid);
        }
        _out_grid = true;
      }
      if (in_grid) {
        if (_out_grid === true) {
          bus.emit(Events.EnterGrid);
        }
        _out_grid = false;
      }
      if (!_pressing) {
        return;
      }
      /** x方向移动的距离 */
      _ox = pos.x - _mx;
      /** y方向移动的距离 */
      _oy = pos.y - _my;
      _dragging = true;
      bus.emit(Events.PointerMove);
    },
    handleMouseUp(pos: { x: number; y: number }) {
      if (_dragging === false) {
      }
      if (_click_count === 2) {
        bus.emit(Events.DoubleClick, pos);
        _click_count = 0;
        if (_timer) {
          clearTimeout(_timer);
          _timer = null;
        }
        if (_timer2) {
          clearTimeout(_timer2);
          _timer2 = null;
        }
      }
      // if (_click_count === 1) {
      //   bus.emit(Events.Click, pos);
      // }
      _pressing = false;
      _dragging = false;
      _mx = 0;
      _my = 0;
      _mx2 = 0;
      _my2 = 0;
      _ox = 0;
      _oy = 0;
      bus.emit(Events.PointerUp);
    },

    onEnterGrid(handler: Handler<TheTypesOfEvents[Events.EnterGrid]>) {
      return bus.on(Events.EnterGrid, handler);
    },
    onLeaveGrid(handler: Handler<TheTypesOfEvents[Events.LeaveGrid]>) {
      return bus.on(Events.LeaveGrid, handler);
    },
    onDoubleClick(handler: Handler<TheTypesOfEvents[Events.DoubleClick]>) {
      return bus.on(Events.DoubleClick, handler);
    },
    onClick(handler: Handler<TheTypesOfEvents[Events.Click]>) {
      return bus.on(Events.Click, handler);
    },
    onLongPress(handler: Handler<TheTypesOfEvents[Events.LongPress]>) {
      return bus.on(Events.LongPress, handler);
    },
  };
}

export type CanvasPointer = ReturnType<typeof CanvasPointer>;
