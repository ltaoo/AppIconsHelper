/**
 * @file 由多条贝塞尔曲线构成的一条路径
 * 用画画来比喻，就是从落笔到收笔绘制的这条线。落笔后，可以画直线，停顿，再画曲线，停顿，再画曲线，直到收笔
 * 那这些停顿过程绘制的一段一段的线，这里称为 segment（后面发现可以叫 Curve）
 * > 现实可以画直线后不停顿继续画曲线，但是在计算机里面不可以
 */
import { base, Handler } from "@/domains/base";
import { BezierPoint, BezierPointMirrorTypes } from "@/biz/bezier_point";
import { Point } from "@/biz/point";
import { CanvasModeManage } from "@/biz/canvas/mode";
import { distanceOfPoints } from "@/biz/bezier_point/utils";
import { Bezier } from "@/utils/bezier/bezier";

import { PathSegment } from "./segment";
import { buildCommandsFromPathPoints, buildOutlineFromPathPoints } from "./utils";

// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-linecap
export type LineCapType = "butt" | "round" | "square";
// export type LineJoinType = "miter" | "round" | "bevel" | "miter-clip" | "arcs";
// https://developer.mozilla.org/zh-CN/docs/Web/API/CanvasRenderingContext2D/lineJoin 只能通过 outline 模拟描边+join样式，才能支持更强的 join 效果
export type LineJoinType = "round" | "bevel" | "miter";
// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
export type PathCompositeOperation = "source-over" | "destination-out";

enum Events {
  Move,
  PointCountChange,
  Change,
}
type BezierPathProps = {
  // beziers: Bezier[];
  // grid: { x: number; y: number; width: number; height: number; unit: number };
  points: BezierPoint[];
  closed?: boolean;
  // mode: CanvasModeManage;
};

export function LinePath(props: BezierPathProps) {
  const { points } = props;

  function refresh_bezier_points() {
    _points = mapToBezierPoints(_path_points);
  }
  function mapToBezierPoints(points: BezierPoint[]) {
    return points.reduce((t, c) => {
      const points: Point[] = [c.point];
      if (c.from) {
        points.push(c.from);
      }
      if (c.to) {
        points.push(c.to);
      }
      return t.concat(points).filter(Boolean);
    }, [] as Point[]);
  }

  let _path_points = points;
  /** 路径 坐标点 + 控制点 */
  let _points = mapToBezierPoints(_path_points);
  let _segments: PathSegment[] = [];
  /** 路径编辑相关状态 Start ------------------ */
  /** 两种情况，钢笔工具时，确定了坐标点，开始拖动改变控制点位置；移动工具时，点击了点，开始拖动改变点位置 */
  let _prepare_dragging = false;
  let _moving_for_new_line = false;
  /** 之前拖动过的路径点 */
  let _prev_path_point: BezierPoint | null = null;
  /** 当前拖动的路径点 */
  let _cur_path_point: BezierPoint | null = null;
  /** 之前拖动过的点，可能是 锚点、坐标点 */
  let _prev_point: Point | null = null;
  /** 当前拖动的点，可能是 锚点、坐标点 */
  let _cur_point: Point | null = null;
  /** 路径编辑相关状态 End ------------------ */
  let _closed = false;
  let _clockwise = true;
  let _composite = "source-over" as PathCompositeOperation;
  let _box = { x: 0, y: 0, x1: 0, y1: 0 };
  /** 一个 <path d="" 标签中，可能有多条路径，该变量指向下一条在同个标签内的路径 */
  let _next: unknown | null = null;
  let _prev: unknown | null = null;
  const _state = {};
  type TheTypesOfEvents = {
    [Events.Move]: { x: number; y: number };
    [Events.PointCountChange]: void;
    [Events.Change]: typeof _state;
  };
  const bus = base<TheTypesOfEvents>();

  return {
    SymbolTag: "LinePath" as const,
    get points() {
      return _points;
    },
    get path_points() {
      return _path_points;
    },
    // 应该提供绘图的命令，而不是具体的实例
    get skeleton() {
      return _path_points;
    },
    get start_point() {
      return _path_points[0] ?? null;
    },
    get closed() {
      return _closed;
    },
    setClosed() {
      _closed = true;
    },
    get clockwise() {
      return _clockwise;
    },
    setClockWise(v: boolean) {
      _clockwise = v;
    },
    get composite() {
      return _composite;
    },
    setComposite(v: PathCompositeOperation) {
      _composite = v;
    },
    get next() {
      const r = _next as LinePath;
      return r;
    },
    setNext(v: unknown) {
      _next = v;
    },
    get prev() {
      const r = _prev as LinePath;
      return r;
    },
    setPrev(v: unknown) {
      _prev = v;
    },
    isInnerOf(b: unknown) {
      const other = b as LinePath;
      const cur_size = this.box;
      const prev_size = other.box;
      // console.log("cur size compare with prev_size", cur_size, prev_size);
      if (
        cur_size.x > prev_size.x &&
        cur_size.y > prev_size.y &&
        cur_size.x1 < prev_size.x1 &&
        cur_size.y1 < prev_size.y1
      ) {
        return true;
      }
      return false;
    },
    get state() {
      return _state;
    },
    /** 获取路径上最后一个坐标点 */
    getCurPoint() {
      return _path_points[_path_points.length - 1] ?? null;
    },
    getPrevPoint(point: BezierPoint) {
      const index = _path_points.findIndex((p) => p === point);
      if (index === -1) {
        return null;
      }
      return _path_points[index - 1] ?? null;
    },
    getLastPoint() {
      return _path_points[_path_points.length - 1] ?? null;
    },
    findBezierPointByPoint(point: Point) {
      for (let i = 0; i < _path_points.length; i += 1) {
        const path_point = _path_points[i];
        if (path_point.point === point) {
          return path_point;
        }
        if (path_point.from === point) {
          return path_point;
        }
        if (path_point.to === point) {
          return path_point;
        }
      }
      return null;
    },
    deletePoint(point: Point) {
      const matched = this.findBezierPointByPoint(point);
      if (!matched) {
        // @todo 删除坐标点，等于将一条路径，拆分成多条
        return;
      }
      if (matched.point === point) {
        return;
      }
      matched.deletePoint(point);
    },
    removeLastVirtualPoint() {
      const last = _path_points[_path_points.length - 1];
      // console.log("[BIZ]bezier_path removeLastVirtualPoint", last?.point.pos, last?.virtual);
      if (!last) {
        return;
      }
      if (last.virtual === false) {
        return;
      }
      // console.log("[BIZ]bezier_path before _path_points.filter", last.virtual);
      _path_points = _path_points.filter((p) => p !== last);
      refresh_bezier_points();
      bus.emit(Events.PointCountChange);
    },
    removeLastPoint() {
      const last = _path_points[_path_points.length - 1];
      if (!last) {
        return;
      }
      // if (last.virtual === false) {
      //   return;
      // }
      // console.log("[BIZ]bezier_path/index - removeLastPoint", last.uid, last.point.pos, last.virtual);
      _path_points = _path_points.filter((p) => p !== last);
      refresh_bezier_points();
      bus.emit(Events.PointCountChange);
    },
    findPrevPointOfPoint(point: BezierPoint) {
      const index = _path_points.findIndex((p) => p === point);
      if (index === -1) {
        return null;
      }
      const prev_index = index - 1;
      if (prev_index < 0) {
        return null;
      }
      const r = _path_points[prev_index];
      if (r) {
        return r;
      }
      return null;
    },
    get segments() {
      return _segments;
    },
    createSegment(point: BezierPoint) {
      const end = point;
      const start = this.findPrevPointOfPoint(point);
      if (!start) {
        return;
      }
      this.createSegmentFromTwoPoint(start, end);
    },
    createSegmentFromTwoPoint(point1: BezierPoint, point2: BezierPoint) {
      const start = point1;
      const end = point2;
      const segment = PathSegment({ start: start.point, end: end.point });
      _segments.push(segment);
      console.log("[BIZ]path/index - createSegmentFromTwoPoint", {
        start: `${start.x} ${start.y}`,
        end: `${end.x} ${end.y}`,
      });
      if (start.to && end.from) {
        console.log("[BIZ]path/index - createSegmentFromTwoPoint controls", {
          to: `${start.to.x} ${start.to.y}`,
          from: `${end.from.x} ${end.from.y}`,
        });
        segment.setControls(start.to, end.from);
      }
      segment.ensure();
    },
    /**
     * 存入了一个锚点，其实就是创建了一条曲线
     */
    appendPoint(point: BezierPoint) {
      const prev = _path_points[_path_points.length - 1];
      // console.log("[BIZ]path/index - appendPoint", !!prev);
      if (prev) {
        prev.setEnd(false);
      }
      point.setEnd(true);
      point.onToOrFromChange(() => {
        refresh_bezier_points();
        bus.emit(Events.PointCountChange);
      });
      _path_points.push(point);
      refresh_bezier_points();
      // console.log("append point", point.start, x, y);
      // _bezier_points.push(...mapToBezierPoints(_path_points));
      bus.emit(Events.PointCountChange);
    },
    checkIsClosed() {
      const first_path_point = _path_points[0];
      const last_path_point = _path_points[_path_points.length - 1];
      // console.log("[BIZ]bezier_path - checkIsClosed", first_path_point.point.pos, last_path_point.point.pos);
      if (first_path_point && last_path_point) {
        if (distanceOfPoints(first_path_point.point.pos, last_path_point.point.pos) <= 0.1) {
          first_path_point.setEnd(true);
          return true;
        }
      }
      return false;
    },

    startMove(pos: { x: number; y: number }) {
      for (let i = 0; i < _path_points.length; i += 1) {
        const point = _path_points[i];
        point.startMove(pos);
      }
    },
    move(distance: { x: number; y: number }) {
      for (let i = 0; i < _path_points.length; i += 1) {
        const point = _path_points[i];
        point.move(distance);
      }
    },
    finishMove(pos: { x: number; y: number }) {
      for (let i = 0; i < _path_points.length; i += 1) {
        const point = _path_points[i];
        point.finishMove(pos);
      }
    },
    get box() {
      return _box;
    },
    buildBox() {
      const rect = {
        x: 0,
        y: 0,
        x1: 0,
        y1: 0,
      };
      console.log("[BIZ]path/index - buildBox the _segments count is", _segments.length);
      for (let i = 0; i < _segments.length; i += 1) {
        const box = _segments[i].box();
        if (box) {
          (() => {
            const { min, max } = box.x;
            if (rect.x === 0 || rect.x > min) {
              rect.x = min;
            }
            if (rect.x1 === 0 || rect.x1 < max) {
              rect.x1 = max;
            }
          })();
          (() => {
            const { min, max } = box.y;
            if (rect.y === 0 || rect.y > min) {
              rect.y = min;
            }
            if (rect.y1 === 0 || rect.y1 < max) {
              rect.y1 = max;
            }
          })();
        }
      }
      _box = rect;
      return rect;
    },
    buildOutline(options: Partial<{ width: number; cap: LineCapType; scene: number }> = {}) {
      return buildOutlineFromPathPoints(_path_points, options);
    },
    // buildCommands() {
    //   const commands: {
    //     c: string;
    //     a: number[];
    //     a2?: number[];
    //     end: null | { x: number; y: number };
    //     start: null | { x: number; y: number };
    //   }[] = [];
    //   for (let i = 0; i < _segments.length; i += 1) {}
    // },
    buildCommands() {
      return buildCommandsFromPathPoints(_path_points);
    },
    onPointCountChange(handler: Handler<TheTypesOfEvents[Events.PointCountChange]>) {
      return bus.on(Events.PointCountChange, handler);
    },
  };
}

export type LinePath = ReturnType<typeof LinePath>;
