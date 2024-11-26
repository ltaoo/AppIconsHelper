import { Bezier } from "@/utils/bezier/bezier";

import { CircleCurved, BezierPoint } from "./index";

export function findSymmetricPoint(point2: { x: number; y: number }, point: { x: number; y: number }) {
  const symmetricPoint = {
    x: 2 * point2.x - point.x,
    y: 2 * point2.y - point.y,
  };
  return toFixPoint(symmetricPoint);
}
function findSymmetricPoint2(a1: { x: number; y: number }, a2: { x: number; y: number }) {
  // const mx = (a1.x + a2.x) / 2;
  // const my = (a1.y + a2.y) / 2;
  const dx = a2.x - a1.x;
  const dy = a2.y - a1.y;
  // const distance = Math.sqrt(dx * dx + dy * dy);
  const a3 = {
    x: a2.x + dx,
    y: a2.y + dy,
  };
  return toFixPoint(a3);
}

export function getSymmetricPoint2(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  a3: { x: number; y: number },
  ratio = 1
) {
  // console.log(a1, a2, a3);
  const m1 = {
    x: (a1.x + a2.x) / 2,
    y: (a1.y + a2.y) / 2,
  };
  // console.log("m1", m1);
  // 计算对称点 a4'
  const a4_prime = {
    x: 2 * m1.x - a3.x,
    y: 2 * m1.y - a3.y,
  };
  // console.log("a4_prime", a4_prime);
  // 计算与 m1 到 a4' 的距离
  // const d = Math.sqrt((m1.x - a3.x) ** 2 + (m1.y - a3.y) ** 2);
  // 计算点 a4
  const a4 = {
    x: m1.x + ratio * (a4_prime.x - m1.x),
    y: m1.y + ratio * (a4_prime.y - m1.y),
  };
  return toFixPoint(a4);
}

const prefix = "data:image/";
const svg = prefix + "svg+xml,";
const space = "%20";
const quotes = "%22";
const equal = "%3D";

export function toBase64(template: string, options: Partial<{ doubleQuote: boolean }> = {}) {
  const { doubleQuote = false } = options;
  // if (template.indexOf(svg) === 0) {
  //   const str = template.replace(new RegExp(svg.replace(/\+/, "\\+")), "").replace(/'/g, '"');
  //   return {
  //     data: decodeURIComponent(str),
  //     input: template,
  //   };
  // }
  if (template.indexOf(prefix) === 0) {
    return template;
  }
  const data = encodeURIComponent(template)
    .replace(new RegExp(space, "g"), " ")
    .replace(new RegExp(quotes, "g"), doubleQuote ? '"' : "'")
    .replace(new RegExp(equal, "g"), "=");
  return svg + data;
}

export function pushIfNoExisting<T>(arr: T[], v: T) {
  if (arr.includes(v)) {
    return arr;
  }
  return arr.push(v);
}

/**
 * 已知两个点，获取连接成线后，垂直该线，并经过 a1，长度为 a1,a2 的 ratio 倍的线的终点坐标
 * 会有两个，一上一下
 */
export function getVerticalPoints(a1: { x: number; y: number }, a2: { x: number; y: number }, ratio: number) {
  const dx = a2.x - a1.x;
  const dy = a2.y - a1.y;
  const length_a1a2 = Math.sqrt(dx * dx + dy * dy);
  const length_line1 = ratio * length_a1a2;
  const unit_perpendicular = { x: -dy / length_a1a2, y: dx / length_a1a2 };
  const line1_end_up = {
    x: a1.x + unit_perpendicular.x * length_line1,
    y: a1.y + unit_perpendicular.y * length_line1,
  };
  const line1_end_down = {
    x: a1.x - unit_perpendicular.x * length_line1,
    y: a1.y - unit_perpendicular.y * length_line1,
  };
  return [line1_end_up, line1_end_down];
}
export const CurveLikeCircleRatio = 0.551915024494;
/**
 * 根据给定的三个在一条直线上的点，获取以该直线为直径的，构成圆的四条贝塞尔曲线
 */
export function buildFourCurveOfCircle(
  f1: { x: number; y: number },
  f5: { x: number; y: number },
  f3: { x: number; y: number }
) {
  // 从右往左
  const [rb, rt] = getVerticalPoints(f1, f5, CurveLikeCircleRatio);
  const [f2, f4] = getVerticalPoints(f5, f3, 1);
  const [bl, br] = getVerticalPoints(f2, f5, CurveLikeCircleRatio);
  const [lt, lb] = getVerticalPoints(f3, f5, CurveLikeCircleRatio);
  const [tr, tl] = getVerticalPoints(f4, f5, CurveLikeCircleRatio);
  return [
    new Bezier([f1, rb, br, f2]),
    new Bezier([f2, bl, lb, f3]),
    new Bezier([f3, lt, tl, f4]),
    new Bezier([f4, tr, rt, f1]),
  ];
}
function buildFourCurveOfCircle2(
  f1: { x: number; y: number },
  f5: { x: number; y: number },
  f3: { x: number; y: number },
  no_reverse: boolean
) {
  const c_ratio = 0.551915024494;
  const [f2, f4] = getVerticalPoints(f5, f3, 1);
  const [rb, rt] = getVerticalPoints(f1, f5, c_ratio);
  const [bl, br] = getVerticalPoints(f2, f5, c_ratio);
  const [lt, lb] = getVerticalPoints(f3, f5, c_ratio);
  const [tr, tl] = getVerticalPoints(f4, f5, c_ratio);
  if (no_reverse) {
    // 顺时针
    return [
      new Bezier([f1, rt, tr, f4]),
      new Bezier([f4, tl, lt, f3]),
      new Bezier([f3, lb, bl, f2]),
      new Bezier([f2, br, rb, f1]),
    ];
  }
  // 逆时针
  return [
    new Bezier([f1, rb, br, f2]),
    new Bezier([f2, bl, lb, f3]),
    new Bezier([f3, lt, tl, f4]),
    new Bezier([f4, tr, rt, f1]),
  ];
}

export function getOutlineOfRect(
  cur: BezierPoint,
  next: BezierPoint,
  extra: Partial<{ radius: number }> = {}
): { curves: Bezier[] } {
  const { radius = 20 } = extra;
  const direction = {
    x: next.point.x - cur.point.x,
    y: next.point.y - cur.point.y,
  };
  const length = Math.sqrt(direction.x ** 2 + direction.y ** 2);
  const unitDirection = {
    x: direction.x / length,
    y: direction.y / length,
  };
  const perpendicularDirection = {
    x: -unitDirection.y,
    y: unitDirection.x,
  };
  const offset = {
    x: radius * perpendicularDirection.x,
    y: radius * perpendicularDirection.y,
  };

  // 计算四个坐标
  const a1 = {
    x: cur.point.x + offset.x,
    y: cur.point.y + offset.y,
  };
  const a2 = {
    x: next.point.x + offset.x,
    y: next.point.y + offset.y,
  };
  const a3 = {
    x: cur.point.x - offset.x,
    y: cur.point.y - offset.y,
  };
  const a4 = {
    x: next.point.x - offset.x,
    y: next.point.y - offset.y,
  };
  const a13 = {
    x: (a3.x - a1.x) / 2 + a1.x,
    y: (a3.y - a1.y) / 2 + a1.y,
  };
  const a24 = {
    x: (a4.x - a2.x) / 2 + a2.x,
    y: (a4.y - a2.y) / 2 + a2.y,
  };
  return {
    curves: [
      // new Bezier([a3, a13, a1]),
      // new Bezier([a1, a2, a2]),
      // new Bezier([a2, a24, a4]),
      // new Bezier([a4, a3, a3]),
      // @ts-ignore
      {
        points: [a3, a13, a1],
        _linear: true,
      },
      // @ts-ignore
      {
        points: [a1, a2, a2],
        _linear: true,
        _3d: false,
      },
      // @ts-ignore
      {
        points: [a2, a24, a4],
        _linear: true,
      },
      // @ts-ignore
      {
        points: [a4, a3, a3],
        _linear: true,
        _3d: false,
      },
    ],
  };
}

/**
 * 计算两条线段的交点
 */
export function getLineIntersection(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
) {
  const a1 = p2.y - p1.y;
  const b1 = p1.x - p2.x;
  const c1 = a1 * p1.x + b1 * p1.y;
  const a2 = p4.y - p3.y;
  const b2 = p3.x - p4.x;
  const c2 = a2 * p3.x + b2 * p3.y;
  const delta = a1 * b2 - a2 * b1;
  if (delta === 0) {
    return null;
  }
  const intersectionX = (b2 * c1 - b1 * c2) / delta;
  const intersectionY = (a1 * c2 - a2 * c1) / delta;
  return { x: intersectionX, y: intersectionY };
}
export function calculateLineLength(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  const { x: x1, y: y1 } = p1;
  const { x: x2, y: y2 } = p2;
  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  return length;
}
export function toFixPoint(pos: { x: number; y: number }) {
  return {
    x: parseFloat(pos.x.toFixed(2)),
    y: parseFloat(pos.y.toFixed(2)),
  };
}
export function toFixValue(v: number) {
  return parseFloat(v.toFixed(2));
}

/**
 * 计算三个点，是否在一条直线上。以及，a2 是否是该直线的中点
 */
export function isCollinear(a1: { x: number; y: number }, a2: { x: number; y: number }, a3: { x: number; y: number }) {
  const x1 = a1.x;
  const y1 = a1.y;
  const x2 = a2.x;
  const y2 = a2.y;
  const x3 = a3.x;
  const y3 = a3.y;
  // 判断是否共线
  const collinear = (y2 - y1) * (x3 - x2) === (y3 - y2) * (x2 - x1);
  // 判断是否是中点
  // const midpoint = x2 == (x1 + x3) / 2 && y2 == (y1 + y3) / 2;
  const midpoint = x2 - x1 === x3 - x2 && y2 - y1 === y3 - y2;
  return {
    collinear,
    midpoint,
  };
}

/**
 * 已知一个圆的半径，和任意圆上两个点坐标，计算圆心位置
 */
export function calculateCircleCenter(a1: { x: number; y: number }, a2: { x: number; y: number }, r: number) {
  const x1 = a1.x,
    y1 = a1.y,
    x2 = a2.x,
    y2 = a2.y;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const d = parseFloat(Math.sqrt(dx * dx + dy * dy).toFixed(3));
  if (d - 2 * r >= 0.05) {
    console.warn("The points are too far apart for the given radius.");
    console.log(d, 2 * r, d - 2 * r);
    console.log(dx, dy, d, 2 * r, a1, a2);
    return null;
  }
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  // const h = Math.sqrt(r * r - (d / 2) * (d / 2));
  const h = Math.sqrt(Math.abs(r * r - (d / 2) * (d / 2)));
  const unitX = -dy / d;
  const unitY = dx / d;
  const center1 = { x: mx + h * unitX, y: my + h * unitY };
  const center2 = { x: mx - h * unitX, y: my - h * unitY };
  // console.log(center2, center1);
  return [center2, center1];
}

export function calculateCircleArcs(
  center: { x: number; y: number },
  pointA: { x: number; y: number },
  pointB: { x: number; y: number }
) {
  const centerX = center.x,
    centerY = center.y;
  const angleA = Math.atan2(pointA.y - centerY, pointA.x - centerX);
  const angleB = Math.atan2(pointB.y - centerY, pointB.x - centerX);
  const startAngle = angleA;
  let endAngle = angleB;
  if (startAngle > endAngle) {
    endAngle += 2 * Math.PI;
  }
  return [
    {
      start: startAngle,
      end: endAngle,
    },
    {
      start: endAngle,
      end: startAngle + 2 * Math.PI,
    },
  ];
}

export function distanceOfPoints(a1: { x: number; y: number }, a2: { x: number; y: number }) {
  const point = a1;
  const x1 = Math.abs(point.x - a2.x);
  const y1 = Math.abs(point.y - a2.y);
  const r = Math.sqrt(Math.pow(x1, 2) + Math.pow(y1, 2));
  return r;
}
export function toFixed(v: string | number) {
  const str = String(v);
  const [integer, dicimel] = str.split(".");
  return parseFloat([integer, dicimel.slice(0, 3)].join("."));
}
function calculateCircleArcs2(
  center: { x: number; y: number },
  pointA: { x: number; y: number },
  pointB: { x: number; y: number }
) {
  const centerX = center.x;
  const centerY = center.y;
  // const angleA = toFixed(Math.atan2(pointA.y - centerY, pointA.x - centerX));
  // const angleB = toFixed(Math.atan2(pointB.y - centerY, pointB.x - centerX));
  const angleA = Math.atan2(pointA.y - centerY, pointA.x - centerX);
  const angleB = Math.atan2(pointB.y - centerY, pointB.x - centerX);
  return {
    start: angleA,
    end: angleB,
  };
}

// export function arcToCanvasArc(
//   p1: { x: number; y: number },
//   arc: {
//     rx: number;
//     ry: number;
//     rotate: number;
//     t1: number;
//     t2: number;
//     end: { x: number; y: number };
//   }
// ) {
//   const { rx, ry, rotate, end, t1, t2 } = arc;
//   let radius = rx;
//   const p2 = end;
//   const is_reverse = p1.x > p2.x;
//   const distance = distanceOfPoints(p1, p2);
//   if (radius < distance / 2) {
//     radius = distance / 2;
//   }
//   // console.log("[BIZ]canvas/index - before calculateCircleCenter", p1, p2, radius);
//   const centers = calculateCircleCenter(p1, p2, radius);
//   if (centers) {
//     const [index1, index2] = (() => {
//       if (t1 === 0 && t2 === 0) {
//         return [0, 1];
//       }
//       if (t1 === 0 && t2 === 1) {
//         return [1, 0];
//       }
//       if (t1 === 1 && t2 === 0) {
//         return [1, 1];
//       }
//       if (t1 === 1 && t2 === 1) {
//         return [0, 0];
//       }
//       return [0, 1];
//     })();
//     const center = centers[index1];
//     const arcs = calculateCircleArcs2(center, p1, p2);
//     const arc = arcs[index2];
//     // console.log("[BIZ]canvas/index - after calculateCircleArcs(center", center, p1, p2, arc);
//     const circle: CircleCurved = {
//       center,
//       radius,
//       arc,
//       counterclockwise: (() => {
//         if (t1 === 0 && t2 === 0) {
//           return true;
//         }
//         if (t1 === 1 && t2 === 0) {
//           if (is_reverse) {
//             return true;
//           }
//         }
//         return false;
//       })(),
//       extra: { start: p1, rx, ry, rotate, t1, t2 },
//     };
//     return circle;
//   }
// }

function findPointAtCurve(
  target: { x: number; y: number },
  curve: Bezier,
  segments = 100
): null | { t: number; index: number; x: number; y: number } {
  const [p1, c1, c2, p2] = curve.points;
  // console.log(p1, p2);
  if (distanceOfPoints(target, p1) < 1) {
    // @ts-ignore
    return { t: 0, index: curve.__index, ...p1 };
  }
  if (distanceOfPoints(target, p2) < 1) {
    // @ts-ignore
    return { t: 1, index: curve.__index, ...p2 };
  }
  if (segments >= 10000) {
    const guess = curve.split(0, 0.2);
    const lut = guess.getLUT(100);
    const matched = (() => {
      for (let i = 1; i < lut.length; i += 1) {
        const point = lut[i];
        const r = distanceOfPoints(target, point);
        if (r < 1) {
          // @ts-ignore
          return { ...point, index: curve.__index };
        }
      }
    })();
    if (matched) {
      return matched;
    }
  }
  const lut = curve.getLUT(segments);
  const matched = (() => {
    for (let i = 1; i < lut.length; i += 1) {
      const point = lut[i];
      const r = distanceOfPoints(target, point);
      if (r < 1) {
        // @ts-ignore
        return { ...point, index: curve.__index };
      }
    }
  })();
  return matched || null;
}

function arcToCanvasArc(
  p1: { x: number; y: number },
  arc: {
    rx: number;
    ry: number;
    rotate: number;
    t1: number;
    t2: number;
    end: { x: number; y: number };
  }
) {
  const { rx, ry, rotate, end, t1, t2 } = arc;
  let radius = rx;
  const p2 = end;
  const is_reverse = p1.x > p2.x || p1.y > p2.y;
  const distance = distanceOfPoints(p1, p2);
  if (radius < distance / 2) {
    radius = distance / 2;
  }
  // console.log("[BIZ]canvas/index - before calculateCircleCenter", p1, p2, radius);
  const centers = calculateCircleCenter(p1, p2, radius);
  if (!centers) {
    // 这里不会出现
    return null;
  }
  const [index1, index2] = (() => {
    if (t1 === 0 && t2 === 0) {
      return [0, 0];
    }
    if (t1 === 0 && t2 === 1) {
      return [1, 0];
    }
    if (t1 === 1 && t2 === 0) {
      return [1, 1];
    }
    if (t1 === 1 && t2 === 1) {
      return [0, 0];
    }
    return [0, 0];
  })();
  const center = centers[index1];
  const { start: startAngle, end: endAngle } = calculateCircleArcs2(center, p1, p2);
  const angle = (() => {
    if (t1 === 0 && t2 === 0) {
      if (startAngle < 0) {
        return { start: startAngle, end: -((360 * Math.PI) / 180) + endAngle, sweep: 0, _i: 0 };
      }
      return { start: startAngle, end: endAngle, sweep: 0 };
    }
    if (t1 === 0 && t2 === 1) {
      if (startAngle < 0 && endAngle < 0) {
        return { start: startAngle, end: endAngle, sweep: 1, _i: 2 };
      }
      if (endAngle < 0) {
        return { start: startAngle, end: (360 * Math.PI) / 180 + endAngle, sweep: 1 };
      }
      return { start: startAngle, end: endAngle, sweep: 1 };
    }
    if (t1 === 1 && t2 === 0) {
      if (is_reverse && endAngle < 0) {
        return { start: startAngle, end: endAngle, sweep: 0 };
      }
      return { start: (360 * Math.PI) / 180 + startAngle, end: endAngle, sweep: 0 };
    }
    if (t1 === 1 && t2 === 1) {
      if (startAngle > 0) {
        return { start: -((360 * Math.PI) / 180) + startAngle, end: endAngle, sweep: 1 };
      }
      if (endAngle < 0) {
        return { start: startAngle, end: (360 * Math.PI) / 180 + endAngle, sweep: 1 };
      }
      return { start: startAngle, end: endAngle, sweep: 1 };
    }
    return { start: startAngle, end: endAngle };
  })();
  const circle = {
    center,
    radius,
    angle1: angle.start,
    angle2: angle.end,
    counterclockwise: angle.sweep === 0,
    extra: { start: p1, rx, ry, rotate, t1, t2 },
    values: [center.x, center.y, radius, angle.start, angle.end, angle.sweep === 0],
  };
  return circle;
}

export function arc_to_curve(
  start: { x: number; y: number },
  arc: { rx: number; ry: number; rotate: number; t1: number; t2: number; end: { x: number; y: number } }
) {
  // console.log("[UTILS]arc_to_curve", start, arc);
  const arcForCanvas = arcToCanvasArc(start, arc);
  if (!arcForCanvas) {
    return [];
  }

  const end = findSymmetricPoint2(start, arcForCanvas.center);

  // console.log(start, arcForCanvas.center, end);

  const curves = buildFourCurveOfCircle2(start, arcForCanvas.center, end, arc.t2 === 1);

  // @ts-ignore
  curves[0].__index = 0;
  // @ts-ignore
  curves[1].__index = 1;
  // @ts-ignore
  curves[2].__index = 2;
  // @ts-ignore
  curves[3].__index = 3;
  // code1.drawCurve(curves[0]);
  // code1.setColor("red");
  // code1.drawCurve(curves[1]);
  // code1.setColor("yellow");
  // code1.drawCurve(curves[2]);
  // code1.setColor("green");
  // code1.drawCurve(curves[3]);
  // code1.drawPoints([arcForCanvas.center]);
  const rightAngle = (90 * Math.PI) / 180;
  const matched_curves = curves.filter((curve, i) => {
    const range = (() => {
      if (arcForCanvas.counterclockwise) {
        return [arcForCanvas.angle1 - i * rightAngle, arcForCanvas.angle1 - (i + 1) * rightAngle];
      }
      return [arcForCanvas.angle1 + i * rightAngle, arcForCanvas.angle1 + (i + 1) * rightAngle];
    })();
    if (
      (arcForCanvas.angle1 >= range[0] && arcForCanvas.angle1 < range[1]) ||
      (arcForCanvas.angle2 >= range[0] && arcForCanvas.angle2 < range[1])
    ) {
      return true;
    }
    if (arcForCanvas.counterclockwise) {
      if (
        (arcForCanvas.angle1 <= range[0] && arcForCanvas.angle1 > range[1]) ||
        (arcForCanvas.angle2 <= range[0] && arcForCanvas.angle2 > range[1])
      ) {
        return true;
      }
    }
    return false;
  });
  // console.log("matched curves", matched_curves, arcForCanvas.counterclockwise);
  if (matched_curves.length === 1) {
    const bezier = matched_curves[0];
    const t = findPointAtCurve(arc.end, bezier, Math.pow(10, arcForCanvas.radius.toFixed(0).length));
    if (t) {
      const points = bezier.split(0, t.t).points;
      return [points].filter(Boolean);
    }
    return [];
  }
  const start_curve = matched_curves[0];
  const end_curve = matched_curves[matched_curves.length - 1];
  if (start_curve && end_curve) {
    // console.log('start', start_curve.points[0]);
    // console.log('end', end_curve.points[end_curve.points.length - 1]);
    // console.log("start and and", start, start_curve.points);
    // console.log(arc.end, end_curve.points);
    const matched_start = findPointAtCurve(start, start_curve);
    const matched_end = findPointAtCurve(arc.end, end_curve);
    // console.log(matched_start, matched_end);
    if (matched_start && matched_end) {
      const start = {
        // @ts-ignore
        index: start_curve.__index,
        t: matched_start.t,
      };
      const end = {
        // @ts-ignore
        index: end_curve.__index,
        t: matched_end.t,
      };
      // console.log(start, end);
      const first = start_curve.split(start.t, 1).points;
      const last = end_curve.split(0, end.t).points;
      // console.log("first and last", first, last);
      const middles = [];
      let i = start.index + 1;
      while (i < end.index) {
        const c = curves[i];
        middles.push(c.points);
        i += 1;
      }
      const points = [first, ...middles, last].filter(Boolean);
      return points;
    }
  }
  return [];
}

export function checkIsClockwise(points: { x: number; y: number }[]) {
  let angleSum = 0;
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const vectorX = p2.x - p1.x;
    const vectorY = p2.y - p1.y;
    const prevVectorX = i === 0 ? points[points.length - 1].x - p1.x : points[i - 1].x - p1.x;
    const prevVectorY = i === 0 ? points[points.length - 1].y - p1.y : points[i - 1].y - p1.y;
    const crossProduct = prevVectorX * vectorY - prevVectorY * vectorX;
    angleSum += crossProduct;
  }
  return angleSum > 0 ? false : true;
}
