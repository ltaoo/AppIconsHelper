import { base, Handler } from "@/domains/base";
import { Point } from "@/biz/point";
import { LinearGradientPayload } from "@/biz/svg/path-parser";
import { LineCapType, LineJoinType, PathCompositeOperation } from "@/biz/line";

import { uuidFactory } from "./utils";
import { Result } from "@/domains/result";

type CanvasLayerProps = {
  zIndex?: number;
  disabled?: boolean;
  onMounted?: (layer: CanvasLayer) => void;
};
const uid = uuidFactory();
export function CanvasLayer(props: CanvasLayerProps) {
  const { zIndex = 0, disabled = false } = props;

  let _mounted = false;
  let _index = uid();
  let _z_index = zIndex;
  let _disabled = disabled;
  let _logs: string[] = [];

  enum Events {
    Mounted,
  }
  type TheTypesOfEvents = {
    [Events.Mounted]: typeof _self;
  };
  const bus = base<TheTypesOfEvents>();

  function onMounted(handler: Handler<TheTypesOfEvents[Events.Mounted]>) {
    return bus.on(Events.Mounted, handler);
  }
  let log = (...args: string[]) => {
    _logs.push(...args);
  };

  if (props.onMounted) {
    onMounted(props.onMounted);
  }
  const _self = {
    SymbolTag: "CanvasLayer" as const,
    drawLine(p1: { x: number; y: number }, p2: { x: number; y: number }) {
      console.log("请实现 drawLine 方法");
    },
    drawCurve(curve: { points: { x: number; y: number }[] }) {
      console.log("请实现 drawCurve 方法");
    },
    drawCircle(point: { x: number; y: number }, radius: number) {
      console.log("请实现 drawCircle 方法");
    },
    drawRect(rect: { x: number; y: number; x1: number; y1: number }, extra: Partial<{ background: string }> = {}) {
      console.log("请实现 drawRect 方法");
    },
    drawLabel(point: { x: number; y: number }) {
      console.log("请实现 drawLabel 方法");
    },
    drawDiamondAtLineEnd(p1: { x: number; y: number }, p2: { x: number; y: number }) {
      console.log("请实现 drawDiamondAtLineEnd 方法");
    },
    drawPoints(points: Point[]) {
      console.log("请实现 drawPoints 方法");
    },
    drawImage(...args: unknown[]) {
      console.log("请实现 drawImage 方法");
    },
    drawGrid(callback: Function) {
      console.log("请实现 drawGrid 方法");
    },
    drawTransparentBackground(callback?: Function) {
      console.log("请实现 drawTransparentBackground 方法");
    },
    clear() {
      console.log("请实现 clear 方法");
    },
    beginPath() {
      console.log("请实现 beginPath 方法");
    },
    closePath() {
      console.log("请实现 closePath 方法");
    },
    moveTo(x: number, y: number) {
      console.log("请实现 moveTo 方法");
    },
    arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean) {
      console.log("请实现 arc 方法");
    },
    bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) {
      console.log("请实现 bezierCurveTo 方法");
    },
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number) {
      console.log("请实现 quadraticCurveTo 方法");
    },
    lineTo(x: number, y: number) {
      console.log("请实现 lineTo 方法");
    },
    setStrokeStyle(v: string) {
      console.log("请实现 setStrokeStyle 方法");
    },
    setLineWidth(v: number) {
      console.log("请实现 setLineWidth 方法");
    },
    setLineCap(v: LineCapType) {
      console.log("请实现 setLineWidth 方法");
    },
    setLineJoin(v: LineJoinType) {
      console.log("请实现 setLineJoin 方法");
    },
    stroke() {
      console.log("请实现 stroke 方法");
    },
    setGlobalCompositeOperation(v: PathCompositeOperation) {
      console.log("请实现 setGlobalCompositeOperation 方法");
    },
    setFillStyle(v: any) {
      console.log("请实现 setFillStyle 方法");
    },
    fill() {
      console.log("请实现 fill 方法");
    },
    setFont(v: string) {
      console.log("请实现 setFont 方法");
    },
    fillText(text: string, x: number, y: number, maxWidth?: number) {
      console.log("请实现 fillText 方法");
    },
    save() {
      console.log("请实现 save 方法");
    },
    restore() {
      console.log("请实现 restore 方法");
    },
    getGradient(payload: LinearGradientPayload): any {
      console.log("请实现 getGradient 方法");
      return null;
    },
    getCanvas(): unknown {
      console.log("请实现 getCanvas 方法");
      return null;
    },
    getBlob(type: string, quality?: string): Promise<Result<Blob>> {
      console.log("请实现 getCanvas 方法");
      return Promise.resolve(Result.Err("请实现 getCanvas 方法"));
    },
    log(...args: string[]) {
      log(...args);
    },
    stopLog() {
      log = () => {};
    },
    resumeLog() {
      log = (...v: string[]) => {
        _logs.push(...v);
      };
    },
    emptyLogs() {
      _logs = [];
    },
    get logs() {
      return _logs;
    },
    get zIndex() {
      return _z_index;
    },
    get disabled() {
      return _disabled;
    },
    get mounted() {
      return _mounted;
    },
    setMounted() {
      _mounted = true;
      bus.emit(Events.Mounted, _self);
    },

    onMounted,
  };
  return _self;
}
export type CanvasLayer = ReturnType<typeof CanvasLayer>;
