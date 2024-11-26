import { CurveLikeCircleRatio } from "@/biz/bezier_point/utils";

const kCommandTypeRegex = /^[\t\n\f\r ]*([MLHVZCSQTAmlhvzcsqta])[\t\n\f\r ]*/;
const kFlagRegex = /^[01]/;
const kNumberRegex = /^[+-]?(([0-9]*\.[0-9]+)|([0-9]+\.)|([0-9]+))([eE][+-]?[0-9]+)?/;
const kCoordinateRegex = kNumberRegex;
const kCommaWsp = /^(([\t\n\f\r ]+,?[\t\n\f\r ]*)|(,[\t\n\f\r ]*))/;

const kGrammar: { [key: string]: RegExp[] } = {
  M: [kCoordinateRegex, kCoordinateRegex],
  L: [kCoordinateRegex, kCoordinateRegex],
  H: [kCoordinateRegex],
  V: [kCoordinateRegex],
  Z: [],
  C: [kCoordinateRegex, kCoordinateRegex, kCoordinateRegex, kCoordinateRegex, kCoordinateRegex, kCoordinateRegex],
  S: [kCoordinateRegex, kCoordinateRegex, kCoordinateRegex, kCoordinateRegex],
  Q: [kCoordinateRegex, kCoordinateRegex, kCoordinateRegex, kCoordinateRegex],
  T: [kCoordinateRegex, kCoordinateRegex],
  A: [kNumberRegex, kNumberRegex, kCoordinateRegex, kFlagRegex, kFlagRegex, kCoordinateRegex, kCoordinateRegex],
};

/**
 * https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/d#path_commands
M (moveto) :
含义：移动到新的起始点，不绘制线条。
语法：M x,y 或 M x1,y1 x2,y2 ...（可以指定多个点）。
示例：M 10 10 将起点移动到坐标 (10, 10)。

L (lineto) :
含义：从当前点绘制一条直线到指定点。
语法：L x,y 或 L x1,y1 x2,y2 ...（可以指定多个点）。
示例：L 20 20 从当前点绘制一条直线到 (20, 20)。

C (cubic Bezier curve) :
含义：绘制一条三次贝塞尔曲线。
语法：C x1,y1 x2,y2 x,y，其中 (x1, y1) 和 (x2, y2) 是控制点，(x, y) 是曲线的终点。
示例：C 30 40, 50 60, 70 80 绘制一条从当前点到 (70, 80) 的三次贝塞尔曲线。

S (smooth cubic Bezier curve) :
含义：绘制一条平滑的三次贝塞尔曲线，使用前一个曲线的终点作为控制点。
语法：S x2,y2 x,y。
示例：S 50 60, 70 80。

Q (quadratic Bezier curve) :
含义：绘制一条二次贝塞尔曲线。
语法：Q x1,y1 x,y。
示例：Q 30 40, 50 60。

T (smooth quadratic Bezier curve) :
含义：绘制一条平滑的二次贝塞尔曲线。
语法：T x,y。
示例：T 50 60。

H (horizontal lineto) :
含义：绘制一条水平线到指定的 x 坐标。
语法：H x。
示例：H 100。

V (vertical lineto) :
含义：绘制一条垂直线到指定的 y 坐标。
语法：V y。
示例：V 100。

Z (closepath) :
含义：关闭路径，绘制一条线从当前点到路径的起始点。
语法：Z。
示例：Z 将当前路径闭合。
 *
 */

export type PathPayload = {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  lineCap?: string;
  lineJoin?: string;
  from?: string;
};
export type LinearGradientPayload = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stops: {
    color: string;
    offset: number;
  }[];
};
function toNum(v?: string) {
  return Number((v || "").replace("%", ""));
}
export class PathParser {
  static components(type: string, path: string, cursor: number): [number, string[][]] {
    const expectedRegexList = kGrammar[type.toUpperCase()];

    const components: string[][] = [];
    while (cursor <= path.length) {
      const component: string[] = [type];
      for (const regex of expectedRegexList) {
        const match = path.slice(cursor).match(regex);

        if (match !== null) {
          component.push(match[0]);
          cursor += match[0].length;
          const ws = path.slice(cursor).match(kCommaWsp);
          if (ws !== null) {
            cursor += ws[0].length;
          }
        } else if (component.length === 1) {
          return [cursor, components];
        } else {
          throw new Error("malformed path (first error at " + cursor + ")");
        }
      }
      components.push(component);
      if (expectedRegexList.length === 0) {
        return [cursor, components];
      }
      if (type === "m") {
        type = "l";
      }
      if (type === "M") {
        type = "L";
      }
    }
    throw new Error("malformed path (first error at " + cursor + ")");
  }

  public static parse_svg(content: string) {
    const result = {
      dimensions: {
        width: 0,
        height: 0,
      },
      linearGradients: [] as LinearGradientPayload[],
      paths: [] as PathPayload[],
    };
    const r1 = /viewBox="([^"]+)"/;
    const r2 = /width="([^"]+)"/;
    const r3 = /height="([^"]+)"/;
    const r4 = /fill="([^"]+)"/;
    const r5 = /stroke="([^"]+)"/;
    const r6 = /stroke-{0,1}[wW]idth="([^"]+)"/;
    const r7 = /stroke-{0,1}[lL]inecap="([^"]+)"/;
    const r8 = /stroke-{0,1}[lL]inejoin="([^"]+)"/;

    const viewBoxMatch = content.match(r1);
    const widthMatch = content.match(r2);
    const heightMatch = content.match(r3);
    if (widthMatch) {
      result.dimensions.width = Number(widthMatch[1]);
    }
    if (heightMatch) {
      result.dimensions.height = Number(heightMatch[1]);
    }
    if (viewBoxMatch) {
      const viewBox = viewBoxMatch[1].split(" ").map(Number);
      if (viewBox.length === 4) {
        result.dimensions.width = viewBox[2];
        result.dimensions.height = viewBox[3];
      }
    }
    const globalSettings: {
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      lineCap?: string;
      lineJoin?: string;
    } = {};
    const fillMatch = content.match(r4);
    const strokeMatch = content.match(r5);
    const strokeWidthMatch = content.match(r6);
    const strokeLineCapMatch = content.match(r7);
    const strokeLineJoinMatch = content.match(r8);
    if (fillMatch) {
      const fill = fillMatch[1];
      if (fill !== "none") {
        globalSettings.fill = fill;
      }
    }
    if (strokeMatch) {
      globalSettings.stroke = strokeMatch[1];
    }
    if (strokeWidthMatch) {
      globalSettings.strokeWidth = Number(strokeWidthMatch[1]);
    }
    if (strokeLineCapMatch) {
      globalSettings.lineCap = strokeLineCapMatch[1];
    }
    if (strokeLineJoinMatch) {
      globalSettings.lineJoin = strokeLineJoinMatch[1];
    }
    // const linearGradientRegex = /<linearGradient([^>]+)\/?>/g;
    const linearGradientRegex = /<linearGradient([^>]{1,})>([\d\D]{1,}?)<\/linearGradient>/g;
    const stopRegex = /<stop stop-color="([^"]*)" offset="([^"]*)"\s*\/?>/g;
    let linearGradientMatch;
    while ((linearGradientMatch = linearGradientRegex.exec(content)) !== null) {
      const attributes = linearGradientMatch[1];
      const stopsContent = linearGradientMatch[2];
      const idMatch = attributes.match(/id="([^"]*)"/);
      const x1Match = attributes.match(/x1="([^"]*)"/);
      const y1Match = attributes.match(/y1="([^"]*)"/);
      const x2Match = attributes.match(/x2="([^"]*)"/);
      const y2Match = attributes.match(/y2="([^"]*)"/);
      if (!idMatch || !x1Match || !x2Match || !y1Match || !y2Match) {
        continue;
      }
      const id = idMatch[1];
      const x1 = toNum(x1Match[1]) / 100;
      const y1 = toNum(y1Match[1]) / 100;
      const x2 = toNum(x2Match[1]) / 100;
      const y2 = toNum(y2Match[1]) / 100;
      const stops = [];
      let stopMatch;
      while ((stopMatch = stopRegex.exec(stopsContent)) !== null) {
        stops.push({
          color: stopMatch[1],
          offset: toNum(stopMatch[2]) / 100,
        });
      }
      result.linearGradients.push({
        id,
        x1,
        y1,
        x2,
        y2,
        stops,
      });
    }
    // find path tag
    const pathRegex = /<path([^>]+)\/?>/g;
    let pathMatch;
    while ((pathMatch = pathRegex.exec(content)) !== null) {
      const attributes = pathMatch[1];
      // console.log("pathAttributes", pathAttributes);
      const dMatch = attributes.match(/d="([^"]+)"/);
      const fillMatch = attributes.match(r4);
      const strokeMatch = attributes.match(r5);
      const strokeWidthMatch = attributes.match(r6);
      const strokeLineCapMatch = attributes.match(r7);
      const strokeLineJoinMatch = attributes.match(r8);
      if (!dMatch) {
        continue;
      }
      const payload: PathPayload = {
        d: dMatch[1],
        ...globalSettings,
      };
      if (fillMatch) {
        const fill = fillMatch[1];
        if (fill !== "none") {
          payload.fill = fill;
        }
      }
      if (strokeMatch) {
        const stroke = strokeMatch[1];
        if (stroke !== "none") {
          payload.stroke = stroke;
        }
      }
      if (strokeWidthMatch) {
        payload.strokeWidth = Number(strokeWidthMatch[1]);
      }
      if (strokeLineCapMatch) {
        payload.lineCap = strokeLineCapMatch[1];
      }
      if (strokeLineJoinMatch) {
        payload.lineJoin = strokeLineJoinMatch[1];
      }
      result.paths.push(payload);
    }
    // find rect tag
    const rectRegexp = /<rect([^>]+)\/?>/g;
    let rectMatch;
    while ((rectMatch = rectRegexp.exec(content)) !== null) {
      const attributes = rectMatch[1];
      const x_match = attributes.match(/x="([^"]{1,})"/);
      const y_match = attributes.match(/y="([^"]{1,})"/);
      const width_match = attributes.match(/width="([^"]{1,})"/);
      const height_match = attributes.match(/height="([^"]{1,})"/);
      const rx_match = attributes.match(/rx="([^"]{1,})"/);
      if (!x_match || !y_match || !width_match || !height_match) {
        continue;
      }
      const x = Number(x_match[1]);
      const y = Number(y_match[1]);
      const width = Number(width_match[1]);
      const height = Number(height_match[1]);
      const payload: PathPayload = {
        from: "rect",
        d: `M${x} ${y}L${x + width} ${y}L${x + width} ${y + height}L${x} ${y + height}L${x} ${y}Z`,
        ...globalSettings,
      };
      if (rx_match) {
        payload.lineJoin = "round";
      }
      result.paths.push(payload);
    }
    const circleRegexp = /<circle([^>]+)\/?>/g;
    let circleMatch;
    while ((circleMatch = circleRegexp.exec(content)) !== null) {
      const attributes = circleMatch[1];
      const x_match = attributes.match(/cx="([^"]{1,})"/);
      const y_match = attributes.match(/cy="([^"]{1,})"/);
      const r_match = attributes.match(/r="([^"]{1,})"/);
      if (!x_match || !y_match || !r_match) {
        continue;
      }
      const x = Number(x_match[1]);
      const y = Number(y_match[1]);
      const radius = Number(r_match[1]);
      const controller_length = radius * CurveLikeCircleRatio;
      const curve1_start = {
        x: x,
        y: y - radius,
      };
      const curve1_c1 = {
        x: x + controller_length,
        y: y - radius,
      };
      const curve1_c2 = {
        x: x + radius,
        y: y - controller_length,
      };
      const curve1_end = {
        x: x + radius,
        y,
      };
      const curve2_c1 = {
        x: x + radius,
        y: y + controller_length,
      };
      const curve2_c2 = {
        x: x + controller_length,
        y: y + radius,
      };
      const curve2_end = {
        x: x,
        y: y + radius,
      };
      const curve3_c1 = {
        x: x - controller_length,
        y: y + radius,
      };
      const curve3_c2 = {
        x: x - radius,
        y: y + controller_length,
      };
      const curve3_end = {
        x: x - radius,
        y: y,
      };
      const curve4_c1 = {
        x: x - radius,
        y: y - controller_length,
      };
      const curve4_c2 = {
        x: x - controller_length,
        y: y - radius,
      };
      const curve4_end = {
        x: x,
        y: y - radius,
      };
      function buildCurveString(
        c1: { x: number; y: number },
        c2: { x: number; y: number },
        end: { x: number; y: number }
      ) {
        return `C${[c1.x, c1.y, c2.x, c2.y, end.x, end.y].join(" ")}`;
      }
      const commands = [
        buildCurveString(curve1_c1, curve1_c2, curve1_end),
        buildCurveString(curve2_c1, curve2_c2, curve2_end),
        buildCurveString(curve3_c1, curve3_c2, curve3_end),
        buildCurveString(curve4_c1, curve4_c2, curve4_end),
      ];
      const payload: PathPayload = {
        from: "circle",
        d: `M${curve1_start.x} ${curve1_start.y}${commands.join("")}Z`,
        ...globalSettings,
      };
      result.paths.push(payload);
    }
    const polygonRegexp = /<polygon([^>]+)\/?>/g;
    let polygonMatch;
    while ((polygonMatch = polygonRegexp.exec(content)) !== null) {
      const attributes = polygonMatch[1];
      const points_match = attributes.match(/points="([^"]{1,})"/);
      if (!points_match) {
        continue;
      }
      const values = points_match[1].split(" ").map((v) => Number(v));
      const start = {
        x: values[0],
        y: values[1],
      };
      const points: { x: number; y: number }[] = [];
      for (let i = 2; i < values.length; i += 2) {
        const x = values[i];
        const y = values[i + 1];
        points.push({
          x,
          y,
        });
      }
      function buildLine(point: { x: number; y: number }) {
        return `L${point.x} ${point.y}`;
      }
      const payload: PathPayload = {
        from: "polygon",
        d: `M${start.x} ${start.y}${points.map((point) => buildLine(point)).join("")}Z`,
        ...globalSettings,
      };
      result.paths.push(payload);
    }
    const ellipseRegexp = /<ellipse([^>]+)\/?>/g;
    let ellipseMatch;
    while ((ellipseMatch = ellipseRegexp.exec(content)) !== null) {
      // console.log("[BIZ]svg/path-parser - there is ellipse");
      const attributes = ellipseMatch[1];
      const x_match = attributes.match(/cx="([^"]{1,})"/);
      const y_match = attributes.match(/cy="([^"]{1,})"/);
      const rx_match = attributes.match(/rx="([^"]{1,})"/);
      const ry_match = attributes.match(/ry="([^"]{1,})"/);
      const fillMatch = attributes.match(r4);
      // console.log("[BIZ]svg/path-parser - check the ellipse is validated", x_match, y_match, rx_match, ry_match);
      if (!x_match || !y_match || !rx_match || !ry_match) {
        continue;
      }
      const x = Number(x_match[1]);
      const y = Number(y_match[1]);
      const rx = Number(rx_match[1]);
      const ry = Number(ry_match[1]);
      const controller_length = rx * CurveLikeCircleRatio;
      const curve1_start = {
        x: x,
        y: y - rx,
      };
      const curve1_c1 = {
        x: x + controller_length,
        y: y - rx,
      };
      const curve1_c2 = {
        x: x + rx,
        y: y - controller_length,
      };
      const curve1_end = {
        x: x + rx,
        y,
      };
      const curve2_c1 = {
        x: x + rx,
        y: y + controller_length,
      };
      const curve2_c2 = {
        x: x + controller_length,
        y: y + rx,
      };
      const curve2_end = {
        x: x,
        y: y + rx,
      };
      const curve3_c1 = {
        x: x - controller_length,
        y: y + rx,
      };
      const curve3_c2 = {
        x: x - rx,
        y: y + controller_length,
      };
      const curve3_end = {
        x: x - rx,
        y: y,
      };
      const curve4_c1 = {
        x: x - rx,
        y: y - controller_length,
      };
      const curve4_c2 = {
        x: x - controller_length,
        y: y - rx,
      };
      const curve4_end = {
        x: x,
        y: y - rx,
      };
      function buildCurveString(
        c1: { x: number; y: number },
        c2: { x: number; y: number },
        end: { x: number; y: number }
      ) {
        return `C${[c1.x, c1.y, c2.x, c2.y, end.x, end.y].join(" ")}`;
      }
      const commands = [
        buildCurveString(curve1_c1, curve1_c2, curve1_end),
        buildCurveString(curve2_c1, curve2_c2, curve2_end),
        buildCurveString(curve3_c1, curve3_c2, curve3_end),
        buildCurveString(curve4_c1, curve4_c2, curve4_end),
      ];
      const payload: PathPayload = {
        from: "ellipse",
        d: `M${curve1_start.x} ${curve1_start.y}${commands.join("")}Z`,
        ...globalSettings,
      };
      if (fillMatch) {
        const fill = fillMatch[1];
        if (fill !== "none") {
          payload.fill = fill;
        }
      }
      result.paths.push(payload);
    }
    return result;
  }

  public static parse(path: string): string[][] {
    let cursor = 0;
    let tokens: string[][] = [];
    while (cursor < path.length) {
      const match = path.slice(cursor).match(kCommandTypeRegex);
      if (match !== null) {
        const command = match[1];
        cursor += match[0].length;
        const componentList = PathParser.components(command, path, cursor);
        cursor = componentList[0];
        tokens = [...tokens, ...componentList[1]];
      } else {
        throw new Error("malformed path (first error at " + cursor + ")");
      }
    }
    return tokens;
  }
}
