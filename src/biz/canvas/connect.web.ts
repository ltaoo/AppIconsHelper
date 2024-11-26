import { Point } from "@/biz/point";
import { LineCapType, LineJoinType, PathCompositeOperation } from "@/biz/line";
import { LinearGradientPayload } from "@/biz/svg/path-parser";

import { Canvas } from "./index";
import { CanvasLayer } from "./layer";
import { Result } from "@/domains/result";

export function connect(store: Canvas, $canvas: HTMLDivElement) {
  if (store.mounted) {
    return;
  }
  const dpr = window.devicePixelRatio || 1;
  // $canvas.width = width * dpr;
  // $canvas.height = height * dpr;

  // const { innerWidth, innerHeight } = window;
  // const width = innerWidth;
  // const height = innerHeight;
  // const width = innerWidth * dpr;
  // const height = innerHeight * dpr;
  // store.setSize({
  //   width,
  //   height,
  // });
  store.setDPR(dpr);
  // $canvas.width = width;
  // $canvas.height = height;
  // $canvas.style.width = `${innerWidth}px`;
  // $canvas.style.height = `${innerHeight}px`;
  // ctx.scale(dpr, dpr);
  $canvas.addEventListener("mousedown", (evt) => {
    store.handleMouseDown({
      x: evt.offsetX,
      y: evt.offsetY,
    });
  });
  $canvas.addEventListener("mousemove", (evt) => {
    store.handleMouseMove({ x: evt.offsetX, y: evt.offsetY });
  });
  console.log('before $canvas.addEventListener("mouseup');
  $canvas.addEventListener("mouseup", (evt) => {
    store.handleMouseUp({ x: evt.offsetX, y: evt.offsetY });
  });

  store.setMounted();
}

export function connectLayer(
  layer: CanvasLayer,
  canvas: Canvas,
  $canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
) {
  const log = layer.log;
  if (layer.mounted) {
    return;
  }
  layer.drawLine = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.closePath();
    ctx.stroke();
  };
  layer.drawCurve = (curve: { points: { x: number; y: number }[] }) => {
    ctx.beginPath();
    const ox = 0;
    const oy = 0;
    const p = curve.points;
    ctx.moveTo(p[0].x + ox, p[0].y + oy);
    if (p.length === 3) {
      ctx.quadraticCurveTo(p[1].x + ox, p[1].y + oy, p[2].x + ox, p[2].y + oy);
    }
    if (p.length === 4) {
      ctx.bezierCurveTo(p[1].x + ox, p[1].y + oy, p[2].x + ox, p[2].y + oy, p[3].x + ox, p[3].y + oy);
    }
    ctx.closePath();
    ctx.stroke();
  };
  layer.drawCircle = (point: { x: number; y: number }, radius: number) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.strokeStyle = "#9e9eff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.fillStyle = "black";
    ctx.font = "10px Arial";
    const x = point.x;
    const y = point.y;
    // @ts-ignore
    // ctx.fillText(`${x},${y}`, x + 2, y - 2);
  };
  layer.drawRect = (
    rect: { x: number; y: number; x1: number; y1: number },
    extra: Partial<{ background: string }> = {}
  ) => {
    ctx.beginPath();
    ctx.moveTo(rect.x, rect.y);
    ctx.lineTo(rect.x1, rect.y);
    ctx.lineTo(rect.x1, rect.y1);
    ctx.lineTo(rect.x, rect.y1);
    ctx.closePath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "blue";
    ctx.stroke();
    if (extra.background) {
      ctx.fillStyle = extra.background;
      ctx.fill();
    }
  };
  layer.drawImage = (
    img: HTMLImageElement,
    start: { x: number; y: number },
    size?: { width: number; height: number },
    start2?: { x: number; y: number },
    size2?: { width: number; height: number }
  ) => {
    // let args = [img, start.x, start.y] as [HTMLImageElement, number, number];
    // if (size) {
    //   args = [img, start.x, start.y, size.width, size.height] as [HTMLImageElement, number, number, number, number];
    // }
    const args = (() => {
      if (size && start2 && size2) {
        return [img, start.x, start.y, size.width, size.height, start2.x, start.y, size2.width, size2.height] as [
          HTMLImageElement,
          number,
          number,
          number,
          number,
          number,
          number,
          number,
          number
        ];
      }
      if (size) {
        return [img, start.x, start.y, size.width, size.height] as [HTMLImageElement, number, number, number, number];
      }
      return [img, start.x, start.y] as [HTMLImageElement, number, number];
    })();
    // @ts-ignore
    ctx.drawImage(...args);
  };
  layer.drawLabel = (point: Point) => {
    ctx.fillStyle = "black";
    ctx.font = "10px Arial";
    const x = point.x;
    const y = point.y;
    // ctx.fillText(`${x - canvas.grid.x},${y - canvas.grid.y}`, x + 2, y - 2);
  };
  layer.drawPoints = (points: Point[]) => {
    console.log("layer.drawPoints", points.length);
    points.forEach((p, i) => {
      layer.drawCircle(p, 3);
      // 绘制坐标
      ctx.fillStyle = "black";
      ctx.font = "10px Arial";
      const x = p.x;
      const y = p.y;
      // ctx.fillText(`(${i})、${x},${y}`, x + 2, y - 2);
    });
  };
  layer.drawDiamondAtLineEnd = (p1: Point, p2: Point) => {
    const size = 3;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const unitX = dx / length;
    const unitY = dy / length;
    const perpX = -unitY;
    const perpY = unitX;
    const diamondTopX = p2.x + perpX * size;
    const diamondTopY = p2.y + perpY * size;
    const diamondRightX = p2.x + unitX * size;
    const diamondRightY = p2.y + unitY * size;
    const diamondBottomX = p2.x - perpX * size;
    const diamondBottomY = p2.y - perpY * size;
    const diamondLeftX = p2.x - unitX * size;
    const diamondLeftY = p2.y - unitY * size;
    ctx.beginPath();
    ctx.moveTo(diamondTopX, diamondTopY);
    ctx.lineTo(diamondRightX, diamondRightY);
    ctx.lineTo(diamondBottomX, diamondBottomY);
    ctx.lineTo(diamondLeftX, diamondLeftY);
    ctx.closePath();
    ctx.strokeStyle = p2.highlighted ? "red" : "#9e9eff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.fillStyle = "black";
    ctx.font = "10px Arial";
    // const x = diamondBottomX;
    // const y = diamondBottomY;
    // ctx.fillText(`${p2.x},${p2.y}`, p2.x + 2, p2.y - 2);
  };
  layer.drawGrid = (finish: Function) => {
    const { width, height } = canvas.size;
    const grid = canvas.grid;
    const unit = grid.unit;
    const start = {
      x: width / 2 - grid.width / 2,
      y: height / 2 - grid.height / 2,
    };
    console.log("[DOMAIN]canvas/connect.web - drawGrid", width, height, grid);
    canvas.setGrid(start);
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = grid.lineWidth;
    // console.log(`ctx.moveTo(${start.x}, ${start.y});`);
    // ctx.moveTo(319.5500069260597, 173.80000376701355);
    // ctx.moveTo(start.x, start.y);
    // console.log(`ctx.lineTo(${start.x + grid.width}, ${start.y});`);
    // ctx.lineTo(831.5500069260597, 173.80000376701355);
    // ctx.lineTo(start.x + grid.width, start.y);
    // 绘制垂直线，x 坐标从左往右移动，并绘制一条垂直线
    for (let x = start.x; x <= start.x + grid.width; x += unit) {
      ctx.moveTo(x, start.y);
      // ctx.lineTo(x, start.y + grid.height / window.devicePixelRatio);
      ctx.lineTo(x, start.y + grid.height);
    }
    // 绘制水平线，y 坐标从上往下移动，并绘制一条水平线
    for (let y = start.y; y <= start.y + grid.height; y += unit) {
      ctx.moveTo(start.x, y);
      // ctx.lineTo(start.x + grid.width / window.devicePixelRatio, y);
      ctx.lineTo(start.x + grid.width, y);
    }
    ctx.closePath();
    ctx.strokeStyle = grid.color;
    ctx.stroke();
    ctx.restore();
    if (finish) {
      finish();
    }
  };
  layer.drawTransparentBackground = (finish: Function) => {
    const cellSize = 10;
    const { width, height } = canvas.size;
    for (let row = 0; row < height; row += cellSize) {
      for (let col = 0; col < width; col += cellSize) {
        ctx.fillStyle = (row / cellSize) % 2 === (col / cellSize) % 2 ? "#f0f0f0" : "#ffffff";
        ctx.fillRect(col, row, cellSize, cellSize);
      }
    }
    if (finish) {
      finish();
    }
  };
  layer.clear = () => {
    const { width, height } = $canvas;
    // 清空画布
    ctx.clearRect(0, 0, width, height);
  };
  layer.beginPath = () => {
    log(`ctx.beginPath();`);
    ctx.beginPath();
  };
  layer.closePath = () => {
    log(`ctx.closePath();`);
    ctx.closePath();
  };
  layer.moveTo = (x: number, y: number) => {
    log(`ctx.moveTo(${x},${y});`);
    ctx.moveTo(x, y);
  };
  layer.arc = (
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise?: boolean
  ) => {
    log(`ctx.arc(${x}, ${y}, ${radius}, ${startAngle}, ${endAngle}, ${Boolean(counterclockwise)});`);
  };
  layer.bezierCurveTo = (cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) => {
    log(`ctx.bezierCurveTo(${cp1x}, ${cp1y}, ${cp2x}, ${cp2y}, ${x}, ${y});`);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
  };
  layer.quadraticCurveTo = (cpx: number, cpy: number, x: number, y: number) => {
    log(`ctx.quadraticCurveTo(${cpx}, ${cpy}, ${x}, ${y});`);
    ctx.quadraticCurveTo(cpx, cpy, x, y);
  };
  layer.lineTo = (x: number, y: number) => {
    log(`ctx.lineTo(${x}, ${y});`);
    ctx.lineTo(x, y);
  };
  layer.setStrokeStyle = (v: string) => {
    log(`ctx.strokeStyle = "${v}";`);
    ctx.strokeStyle = v;
  };
  layer.setLineWidth = (v: number) => {
    log(`ctx.lineWidth = ${v};`);
    ctx.lineWidth = v;
  };
  layer.setLineCap = (v: LineCapType) => {
    log(`ctx.lineCap = "${v}";`);
    ctx.lineCap = v;
  };
  layer.setLineJoin = (v: LineJoinType) => {
    log(`ctx.lineJoin = "${v}";`);
    ctx.lineJoin = v;
  };
  layer.stroke = () => {
    log(`ctx.stroke();`);
    ctx.stroke();
  };
  layer.setGlobalCompositeOperation = (v: PathCompositeOperation) => {
    log(`ctx.globalCompositeOperation = "${v}";`);
    ctx.globalCompositeOperation = v;
  };
  layer.setFillStyle = (v: string) => {
    log(`ctx.fillStyle = "${v}";`);
    ctx.fillStyle = v;
  };
  layer.fill = () => {
    log(`ctx.fill();`);
    ctx.fill();
  };
  layer.save = () => {
    ctx.save();
  };
  layer.restore = () => {
    ctx.restore();
  };
  const existingGradients: Record<string, any> = {};
  layer.getGradient = (payload: LinearGradientPayload) => {
    const { id, x1, y1, x2, y2, stops } = payload;
    if (existingGradients[id]) {
      return existingGradients[id];
    }
    const {
      size: { width, height },
    } = canvas;
    const gradient = ctx.createLinearGradient(x1 * width, y1 * height, x2 * width, y2 * height);
    for (let i = 0; i < stops.length; i += 1) {
      const config = stops[i];
      gradient.addColorStop(config.offset, config.color);
    }
    existingGradients[id] = gradient;
    return existingGradients[id];
  };
  layer.getCanvas = () => {
    return $canvas;
  };
  layer.getBlob = (type: string, quality?: string) => {
    return new Promise((resolve) => {
      $canvas.toBlob(
        (data) => {
          if (data === null) {
            return resolve(Result.Err("获取失败，内容为空"));
          }
          return resolve(Result.Ok(data));
        },
        type,
        quality
      );
    });
  };

  $canvas.width = canvas.size.width;
  $canvas.height = canvas.size.height;

  layer.setMounted();
}
