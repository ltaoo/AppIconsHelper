import { BezierPoint } from "@/biz/bezier_point";
import { Bezier } from "@/utils/bezier/bezier";
import {
  calculateLineLength,
  buildFourCurveOfCircle,
  getOutlineOfRect,
  getLineIntersection,
  toFixPoint,
  isCollinear,
  calculateCircleCenter,
  calculateCircleArcs,
  distanceOfPoints,
} from "@/biz/bezier_point/utils";

import { LineCapType } from "./index";

export function buildOutlineFromPathPoints(
  _path_points: BezierPoint[],
  options: Partial<{ width: number; cap: LineCapType; scene: number }> = {}
) {
  const { cap = "round", width = 20, scene } = options;
  //  const shapes1 = curve1.outline(20);
  // const forward_path: { x: number; y: number }[][] = [];
  let forward_path: Bezier[] = [];
  // const curve: { x: number; y: number }[][] = [];
  let back_path: Bezier[] = [];
  let start_cap: Bezier | null = null;
  let end_cap: Bezier | null = null;
  let prev_linear: {
    // curve: Bezier;
    forward: Bezier[];
    back: Bezier[];
  } | null = null;
  // console.log("[BIZ]bezier_path - buildOutline before i < _path_points.length;", _path_points);
  for (let i = 0; i < _path_points.length; i += 1) {
    const cur = _path_points[i];
    // const prev = _path_points[i - 1];
    const next = _path_points[i + 1];
    let is_linear = false;
    (() => {
      // console.log("[BIZ]bezier_path - buildOutline before next && !next.virtual", next && !next.virtual);
      if (next && !next.virtual) {
        // console.log("[BIZ]bezier_path - buildOutline after new Bezier");
        // curve.push([cur.point, cur.to || { x: 0, y: 0 }, next.from || { x: 0, y: 0 }, cur.point]);
        // curve.push(curve1.points);
        const outline = (() => {
          if (!cur.to && !next.from) {
            is_linear = true;
            // 直线
            const outline = getOutlineOfRect(cur, next, { radius: width });
            return outline;
          }
          // console.log(cur.point.x, cur.point.y);
          // console.log("[BIZ]bezier_path - buildOutline before new Bezier");
          // @ts-ignore
          const points: { x: number; y: number }[] = [
            cur.point,
            cur.to ? cur.to : cur.point,
            next.from ? next.from : null,
            next.point,
          ].filter(Boolean);
          const curve1 = new Bezier(points);
          return curve1.outline(width);
        })();
        if (scene === 1) {
          console.log("cur line is linear?", is_linear);
        }
        let k = 0;
        if (cur.start) {
          start_cap = outline.curves[k];
        }
        k += 1;
        let is_forward = true;
        let tmp_forward: Bezier[] = [];
        let tmp_back: Bezier[] = [];
        while (k < outline.curves.length) {
          const curve = outline.curves[k];
          if (curve._3d === undefined) {
            is_forward = false;
            end_cap = curve;
            break;
            // return;
          }
          if (is_forward) {
            tmp_forward.push(curve);
          }
          k += 1;
        }
        let j = outline.curves.length - 1;
        while (j > k) {
          const curve = outline.curves[j];
          if (!is_forward) {
            // back_path.unshift(curve);
            tmp_back.unshift(curve);
          }
          j -= 1;
        }
        if (scene === 1) {
          console.log("prev line is linear?", prev_linear);
        }
        if (prev_linear) {
          // 如果前一条是直线，就要处理相连点了
          const prev_last_forward = prev_linear.forward[prev_linear.forward.length - 1];
          const cur_first_forward = tmp_forward[0];
          const prev_last_forward_points = prev_last_forward.points;
          const cur_first_forward_points = cur_first_forward.points;
          const forward_intersection = getLineIntersection(
            prev_last_forward_points[1],
            prev_last_forward_points[0],
            cur_first_forward_points[0],
            cur_first_forward_points[1]
          );
          if (forward_intersection) {
            const l1 = calculateLineLength(prev_last_forward_points[0], prev_last_forward_points[1]);
            const l2 = calculateLineLength(prev_last_forward_points[1], forward_intersection);
            if (l2 <= l1 * 0.3) {
              // @ts-ignore
              forward_path.push({
                points: [prev_last_forward_points[0], forward_intersection, forward_intersection],
                _linear: true,
                _3d: false,
              });
              // @ts-ignore
              tmp_forward.unshift({
                points: [forward_intersection, cur_first_forward_points[0], cur_first_forward_points[0]],
                _linear: true,
                _3d: false,
              });
            } else {
              // @ts-ignore
              tmp_forward.unshift({
                points: [prev_last_forward_points[0], cur_first_forward_points[0], cur_first_forward_points[0]],
                _linear: true,
                _3d: false,
              });
            }
            // prev_last_forward_points[2] = prev_last_forward_points[1] = forward_intersection;
            // cur_first_forward_points[0] = forward_intersection;
          }
          // 计算反面相交点
          const prev_first_back = prev_linear.back[0];
          const prev_first_back_points = prev_first_back.points;
          const curve = (() => {
            let z = tmp_back.length - 1;
            while (z >= 0) {
              const b = tmp_back[z];
              if (typeof b.intersects === "function") {
                // 是曲线
                // if (scene === 1) {
                //   debugger;
                // }
                b.points = b.points.map((p: { x: number; y: number }) => toFixPoint(p));
                const t = b.intersects({
                  p1: prev_first_back_points[0],
                  p2: prev_first_back_points[1],
                });
                if (scene === 1) {
                  console.log("cur is curves, find intersection", t, b.points, prev_first_back_points);
                }
                if (t.length !== 0) {
                  const p = b.get(t[0]);
                  // console.log(p);
                  const part = b.split(0, t[0]);
                  return { index: z, intersection: p, curve: part };
                }
              } else {
                // 是直线
                const back_intersection = getLineIntersection(
                  prev_first_back_points[1],
                  prev_first_back_points[0],
                  b.points[0],
                  b.points[1]
                );
                if (back_intersection) {
                  b.points[1] = b.points[2] = back_intersection;
                  return {
                    index: z,
                    intersection: back_intersection,
                    curve: b,
                  };
                }
              }
              z -= 1;
            }
            return null;
          })();
          // if (scene === 1) {
          // console.log("has back_intersection", curve);
          // console.log("has back_intersection", prev_first_back_points, cur_last_back_points, back_intersection);
          // }
          if (curve) {
            const matched = tmp_back[curve.index];
            if (matched) {
              tmp_back = tmp_back.slice(0, curve.index + 1);
              // @ts-ignore
              matched.points = curve.curve.points;
              prev_first_back_points[0] = matched.points[0];
            }
          }
          prev_linear = null;
        }
        if (is_linear) {
          prev_linear = {
            forward: tmp_forward,
            back: tmp_back,
          };
        }
        // if (scene === 1) {
        //   console.log("before join forward path", tmp_forward);
        // }
        forward_path = [...forward_path, ...tmp_forward];
        back_path = [...tmp_back, ...back_path];
        return;
      }
    })();
  }
  // const outline = forward_path;
  let outline: Bezier[] = [];
  if (start_cap) {
    // console.log("start_cap", start_cap.points);
    if (cap === "round") {
      const [tl2, tr2] = buildFourCurveOfCircle(start_cap.points[0], start_cap.points[1], start_cap.points[2]);
      outline.push(tl2);
      outline.push(tr2);
    }
    if (cap === "butt") {
      outline.push(start_cap);
    }
  }
  outline = [...outline, ...forward_path];
  if (end_cap) {
    // console.log("end_cap", end_cap.points);
    if (cap === "round") {
      const [tl1, tr1] = buildFourCurveOfCircle(end_cap.points[0], end_cap.points[1], end_cap.points[2]);
      outline.push(tl1);
      outline.push(tr1);
    }
    if (cap === "butt") {
      outline.push(end_cap);
    }
  }
  outline = [...outline, ...back_path];
  // console.log("out lines", outline);
  // for (let i = 0; i < outline.length; i += 1) {
  //   const curve = outline[i];
  //   const next = outline[i + 1];
  //   (() => {
  //     if (!next) {
  //       return;
  //     }
  //     if (curve._linear && next._linear) {

  //     }
  //   })();
  // }
  return {
    // curve,
    outline,
  };
}

export function buildCommandsFromPathPoints(_path_points: BezierPoint[]) {
  const commands: {
    c: string;
    a: number[];
    a2?: number[];
    end: null | { x: number; y: number };
    start: null | { x: number; y: number };
  }[] = [];
  // console.log("[BIZ]bezier_path/index - getCommands", _path_points);
  let is_closed: null | BezierPoint = null;
  for (let i = 0; i < _path_points.length; i += 1) {
    const prev = _path_points[i - 1];
    const cur = _path_points[i];
    // console.log(
    //   "[BIZ]path/utils - buildCommands - loop",
    //   i,
    //   `${cur.x}, ${cur.y}`,
    //   `${cur.from?.x}, ${cur.from?.y}`,
    //   `${cur.to?.x}, ${cur.to?.y}`
    // );
    const next = _path_points[i + 1];
    if (cur.start) {
      if (cur.end) {
        is_closed = cur;
      }
      commands.push({
        c: "M",
        a: [cur.x, cur.y],
        end: prev ? prev.point.pos : null,
        start: null,
      });
    }
    (() => {
      if (cur.hidden) {
        return;
      }
      if (prev) {
        if (prev.to && cur.from) {
          // 三次贝塞尔
          commands.push({
            c: "C",
            a: [prev.to.x, prev.to.y, cur.from.x, cur.from.y, cur.x, cur.y],
            end: prev ? prev.point.pos : null,
            start: next && !next.from ? cur.point.pos : null,
          });
          return;
        }
        if (!prev.to && cur.from) {
          // 二次贝塞尔
          commands.push({
            c: "Q",
            a: [cur.from.x, cur.from.y, cur.point.x, cur.point.y],
            end: prev ? prev.point.pos : null,
            start: next && !next.from ? cur.point.pos : null,
          });
          return;
        }
        if (prev.to && !cur.from) {
          commands.push({
            c: "Q",
            a: [prev.to.x, prev.to.y, cur.point.x, cur.point.y],
            end: cur.point.pos,
            start: prev.point.pos,
          });
          return;
        }
      }
      if (cur.circle) {
        // 弧线
        // console.log("[BIZ]bezier_path - index - after if (cur.circle", cur.circle.center, cur.circle.arc);
        const { counterclockwise, extra } = cur.circle;
        commands.push({
          c: "A",
          // 这个是给 canvas 绘制
          a: [
            cur.circle.center.x,
            cur.circle.center.y,
            cur.circle.radius,
            counterclockwise ? cur.circle.arc.end : cur.circle.arc.start,
            counterclockwise ? cur.circle.arc.start : cur.circle.arc.end,
            Number(counterclockwise),
          ],
          // 这个是给 SVG 绘制
          a2: [
            // extra.start.x,
            // extra.start.y,
            extra.rx,
            extra.ry,
            extra.rotate,
            extra.t1,
            extra.t2,
            cur.point.pos.x,
            cur.point.pos.y,
          ],
          end: next && next.from ? cur.point.pos : null,
          start: extra.start,
        });
        return;
      }
      if (prev && !prev.to && !cur.from) {
        // 直线
        commands.push({
          c: "L",
          a: [cur.x, cur.y],
          end: prev ? prev.point.pos : null,
          start: null,
        });
        return;
      }
    })();
    if (!next && is_closed) {
      if (cur.to && is_closed.from) {
        // 比如 起点，一条曲线，然后再一条曲线直接回到起点，形成闭合
        // 那么作为最后一个点，是没有 next，但是路径又闭合了，此时是还需要一条路径的
        commands.push({
          c: "C",
          a: [cur.to.x, cur.to.y, is_closed.from.x, is_closed.from.y, is_closed.point.x, is_closed.point.y],
          end: prev ? prev.point.pos : null,
          start: null,
        });
      }
      if (!cur.to && !is_closed.from) {
        commands.push({
          c: "L",
          a: [is_closed.point.x, is_closed.point.y],
          end: prev ? prev.point.pos : null,
          start: null,
        });
      }
      commands.push({
        c: "Z",
        a: [],
        end: prev ? prev.point.pos : null,
        start: null,
      });
    }
  }
  // const buildOutline
  // console.log("before return commands", commands);
  return commands;
}
