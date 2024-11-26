import { base } from "@/domains/base";
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
import { objectToHTML } from "@/utils";
import { buildPath, opentypeCommandsToTokens } from "./utils";
import { PathParser } from "@/biz/svg/path-parser";

let debug = false;

/**
 * 转换相关的实现
 * 比如 SVG 路径标签转 Path 对象
 * Path 对象转 SVG 等等
 */
export function CanvasConverter(props: {
  grid: { x: number; y: number; width: number; height: number; unit: number };
}) {
  const { grid } = props;
  let _grid = grid;
  return {
    scaleX(v: number, extra: Partial<{ scale: number; precision: number; isExport: boolean }> = {}) {
      if (debug) {
        return v;
      }
      const { scale = 1, precision = 3, isExport } = extra;
      const offset = 0;
      const v1 = v * scale;
      const v2 = isExport ? v1 - offset : v1 + offset;
      const x = parseFloat(v2.toFixed(precision));
      return x;
    },
    scaleY(v: number, extra: Partial<{ scale: number; precision: number; isExport: boolean }> = {}) {
      if (debug) {
        return v;
      }
      const { scale = 1, precision = 3, isExport } = extra;
      const offset = 0;
      const v1 = v * scale;
      const v2 = isExport ? v1 - offset : v1 + offset;
      const y = parseFloat(v2.toFixed(precision));
      return y;
    },
    scale(
      values: { x: number; y: number },
      extra: Partial<{ scale: number; precision: number; isExport: boolean }> = {}
    ) {
      return {
        x: this.scaleX(values.x, extra),
        y: this.scaleY(values.y, extra),
      };
    },
    translateX(v: number) {
      if (debug) {
        return v;
      }
      return v + _grid.x;
    },
    translateY(v: number) {
      if (debug) {
        return v;
      }
      return v + _grid.y;
    },
    translate(pos: { x: number; y: number }) {
      //       if (_editing_pen) {
      //         return {
      //           x: pos.x,
      //           y: pos.y,
      //         };
      //       }
      return {
        x: this.translateX(pos.x),
        y: this.translateY(pos.y),
      };
    },
    transformPos(pos: { x: number; y: number }, extra: Partial<{ scale: number; precision: number }> = {}) {
      const x = this.scaleX(pos.x, extra);
      const y = this.scaleY(pos.y, extra);
      return [x, y];
    },
    transformPos2(pos: { x: number; y: number }, extra: Partial<{ scale: number; precision: number }> = {}) {
      const { precision = 2 } = extra;
      // const x = this.normalizeX(pos.x, extra);
      // const y = this.normalizeY(pos.y, extra);
      const x = parseFloat((pos.x - _grid.x).toFixed(precision));
      const y = parseFloat((pos.y - _grid.y).toFixed(precision));
      return [x, y];
    },
    buildSVGPaths(lines: Line[], options: Partial<{ scale: number }> = {}) {
      const { scale } = options;
      const path_string_arr: (Line["state"] & { d: string })[] = [];
      // console.log("[BIZ]canvas/index - buildSVGPaths before for(let i", paths.length);
      for (let i = 0; i < lines.length; i += 1) {
        const path = lines[i];
        let d = "";
        // const { outline } = path.buildOutline({ cap: options.cap, scene: 1 });
        // const first = outline[0];
        // if (!first) {
        //   svg += "</svg>";
        //   return svg;
        // }
        // for (let i = 0; i < outline.length; i += 1) {
        //   const curve = outline[i];
        //   const [start, c1, c2, end] = curve.points;
        //   // console.log(start, c1, c2, end);
        //   if (i === 0 && start) {
        //     d += `M${this.transformPos(start, { scale }).join(" ")}`;
        //   }
        //   (() => {
        //     if (curve._linear) {
        //       d += `L${this.transformPos(c2, { scale }).join(" ")}`;
        //       return;
        //     }
        //     if (end) {
        //       d += `C${[
        //         ...this.transformPos(c1, { scale }),
        //         ...this.transformPos(c2, { scale }),
        //         ...this.transformPos(end, { scale }),
        //       ].join(" ")}`;
        //       return;
        //     }
        //     d += `Q${[...this.transformPos(c1, { scale }), ...this.transformPos(c2, { scale })].join(" ")}`;
        //   })();
        // }
        // d += "Z";
        for (let j = 0; j < path.paths.length; j += 1) {
          const commands = path.paths[j].buildCommands();
          for (let i = 0; i < commands.length; i += 1) {
            const { c, a, a2 } = commands[i];
            if (i === 0) {
              d += `M${this.transformPos2({ x: a[0], y: a[1] }, { scale }).join(" ")}`;
            }
            (() => {
              if (c === "L") {
                d += `L${this.transformPos2({ x: a[0], y: a[1] }, { scale }).join(" ")}`;
                return;
              }
              if (c === "A" && a2) {
                const end = [a2[5], a2[6]];
                const rrr = [
                  a2[0],
                  a2[1],
                  a2[2],
                  a2[3],
                  a2[4],
                  ...this.transformPos2({ x: end[0], y: end[1] }, { scale }),
                ].join(" ");
                d += `A${rrr}`;
                return;
              }
              if (c === "C") {
                d += `C${[
                  ...this.transformPos2({ x: a[0], y: a[1] }, { scale }),
                  ...this.transformPos2({ x: a[2], y: a[3] }, { scale }),
                  ...this.transformPos2({ x: a[4], y: a[5] }, { scale }),
                ].join(" ")}`;
                return;
              }
              if (c === "Q") {
                d += `Q${[
                  ...this.transformPos2({ x: a[0], y: a[1] }, { scale }),
                  ...this.transformPos2({ x: a[2], y: a[3] }, { scale }),
                ].join(" ")}`;
              }
            })();
          }
        }
        path_string_arr.push({
          d,
          fill: path.state.fill,
          stroke: path.state.stroke,
          composite: path.state.composite,
        });
      }
      return path_string_arr;
    },
    buildSVGJSON(
      lines: Line[],
      options: Partial<{ cap: LineCapType; join: LineJoinType; width: number; height: number }> = {}
    ) {
      const scale = 1;
      const box = {
        width: _grid.width * scale,
        height: _grid.height * scale,
      };
      const size = {
        width: options.width || box.width,
        height: options.height || box.height,
      };
      const arr = this.buildSVGPaths(lines, { scale });
      // console.log("[BIZ]canvas/index - buildSVGJSON after this.buildSVGPaths", arr);
      if (arr.length === 0) {
        return null;
      }
      const paths: Record<string, string>[] = arr.map((d, i) => {
        const data: {
          id: string;
          tag: string;
          d: string;
          fill?: string;
          stroke?: string;
          "stroke-width"?: string;
          "stroke-linecap"?: string;
          "stroke-linejoin"?: string;
        } = {
          id: `svg_${i + 1}`,
          tag: "path",
          d: d.d,
        };
        if (d.fill.enabled) {
          data.fill = d.fill.color;
        }
        if (d.stroke.enabled) {
          data.stroke = d.stroke.color;
          if (d.stroke.width) {
            data["stroke-width"] = String(d.stroke.width * _grid.unit);
          }
          if (d.stroke.start_cap) {
            data["stroke-linecap"] = d.stroke.start_cap;
          }
          if (d.stroke.join) {
            data["stroke-linejoin"] = d.stroke.join;
          }
        }
        return data;
      });
      const svg = {
        tag: "svg",
        viewBox: `0 0 ${box.width} ${box.height}`,
        width: size.width,
        height: size.height,
        xmlns: "http://www.w3.org/2000/svg",
        "xmlns:svg": "http://www.w3.org/2000/svg",
        class: "icon",
        version: "1.1",
        fill: "none",
        children: paths,
      };
      // path.fill = "#111111";
      // const svg = `<svg viewBox="0 0 ${box.width} ${box.height}" width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" class="icon" version="1.1"><g class="layer">`;
      // svg += `<path d="${d}" fill="#111111" id="svg_1" />`;
      // if (path.state.stroke.enabled) {
      // }
      return svg;
    },
    buildSVG(
      lines: Line[],
      options: Partial<{ cap: LineCapType; join: LineJoinType; width: number; height: number }> = {}
    ) {
      const r = this.buildSVGJSON(lines, options);
      if (!r) {
        return null;
      }
      return objectToHTML(r);
    },
    buildWeappCode(lines: Line[]) {
      const svg = this.buildSVGJSON(lines);
      if (!svg) {
        return null;
      }
      const str = objectToHTML(svg);
      const url = toBase64(str, { doubleQuote: true });
      const template = `.icon-example {\n\t-webkit-mask:url('${url}') no-repeat 50% 50%;\n\t-webkit-mask-size: cover;\n}`;
      return template;
    },
    /** 构建多种尺寸的 icon 用于预览 */
    buildPreviewIcons(lines: Line[]) {
      const svg = this.buildSVGJSON(lines);
      if (!svg) {
        return [];
      }
      console.log("[BIZ]canvas - preview", svg);
      svg.width = 64;
      svg.height = 64;
      const str1 = objectToHTML(svg);
      svg.width = 32;
      svg.height = 32;
      const str2 = objectToHTML(svg);
      svg.width = 24;
      svg.height = 24;
      const str3 = objectToHTML(svg);
      return [
        { content: str3, text: "24x24", width: "24px", height: "24px" },
        { content: str2, text: "32x32", width: "32px", height: "32px" },
        { content: str1, text: "64x64", width: "64px", height: "64px" },
      ];
    },
    buildBezierPathsFromOpentype(
      commands: {
        type: string;
        x?: number;
        y?: number;
        x1?: number;
        y1?: number;
        x2?: number;
        y2?: number;
      }[]
    ) {
      const lines: Line[] = [];
      const tokens = opentypeCommandsToTokens(commands);
      const line = Line({
        fill: {
          color: "#000",
        },
        stroke: null,
      });
      this.buildPath(line, tokens, { exp: false, scale: 1 });
      lines.push(line);
      return {
        paths: lines,
      };
    },
    buildBezierPathsFromPathString(svg: string) {
      if (!svg.startsWith("<svg")) {
        return null;
      }
      const data = PathParser.parse_svg(svg);
      const lines: Line[] = [];
      const { dimensions } = data;
      const extra = {
        exp: false,
        scale: dimensions ? _grid.width / dimensions.width : 1,
      };
      // console.log("extra", xExtra.scale, yExtra.scale, dimensions, _grid.width, _grid.height);
      for (let j = 0; j < data.paths.length; j += 1) {
        const payload = data.paths[j];
        const content = payload.d;
        const tokens = PathParser.parse(content);
        const line = Line({
          fill: payload.fill
            ? {
                color: payload.fill,
              }
            : null,
          stroke: payload.stroke
            ? {
                color: payload.stroke,
                width: payload.strokeWidth || 1,
                cap: payload.lineCap,
                join: payload.lineJoin,
              }
            : null,
        });
        this.buildPath(line, tokens, extra);
        lines.push(line);
      }
      return {
        paths: lines,
        dimensions: data.dimensions,
        gradients: data.linearGradients,
      };
    },
    buildPath(path: Line, tokens: string[][], extra: {}) {
      const xExtra = extra;
      const yExtra = extra;
      buildPath(path, tokens, {
        normalizeX: (v: number) => {
          return this.scaleX(v, xExtra);
        },
        normalizeY: (v: number) => {
          return this.scaleY(v, yExtra);
        },
        translate: (point: { x: number; y: number }) => {
          return this.translate(point);
        },
        translateX: (v: number) => {
          return this.translateX(v);
        },
        translateY: (v: number) => {
          return this.translateY(v);
        },
      });
    },
  };
}

export type CanvasConverter = ReturnType<typeof CanvasConverter>;
