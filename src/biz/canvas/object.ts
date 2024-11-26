import { base, Handler } from "@/domains/base";

import { checkPosInBox, createEmptyRectShape, degToRadian, getAngle, calcNewStyleOfTransformingBox, uuidFactory } from "./utils";
import { Position, RectShape, Size } from "./types";
import { CursorType } from "./constants";

const uuid = uuidFactory();

type CanvasObjectProps = {
  rect: RectShape;
  options: {
    /** 缩放比例 */
    ratio?: number;
    /** 最小宽度 */
    minWidth?: number;
    /** 最小高度 */
    minHeight?: number;
    /** 开始拖动时的回调 */
    onStartDrag?: (ins: CanvasObject) => void;
    /**
     * 拖动时的回调，返回值会作为真正要移动的位置
     */
    onDrag?: (rect: RectShape, pos: Position) => RectShape;
    /**
     * 结束拖动时的回调
     * @param {object} result
     * @param {object} result.diff 从拖动开始到结束，变换的差异值
     */
    onEndDrag?: (result: { diff: RectShape }) => void;
    onStartResize?: () => void;
    onResize?: () => void;
    onEndResize?: (result: { diff: RectShape }) => void;
    onStartRotate?: () => void;
    onRotate?: () => void;
    onEndRotate?: (result: { diff: RectShape }) => void;
    onStartPress?: () => void;
    onEndPress?: () => void;
    onCursorChange?: (v: CursorType) => void;
  };
};
export function CanvasObject(props: CanvasObjectProps) {
  const { rect, options } = props;
  let _id = uuid();
  let _click_time = 0;
  /** 是否按下状态 */
  let _pressing = false;
  let _moving = false;
  /** 是否正在拖动 */
  let _dragging = false;
  /** 是否正在缩放 */
  let _resizing = false;
  /** 是否正在旋转 */
  let _rotating = false;
  /** 是否锁定 */
  let _locking = false;
  let _selected = false;
  let _node: null | unknown = null;
  /** 容器尺寸、位置信息 */
  let _client: RectShape = rect;
  /** 开始变换前的位置(用于计算变换的差异值，移动了多少、旋转了多少等) */
  let _tmpClient: null | RectShape = null;
  /** 变形的额外参数 */
  let _options = options;
  let _initialX = 0;
  let _initialY = 0;
  let _invokedDragStart = false;
  /** 缩放方向 */
  let _resizeType: string;
  /** 是否等比缩放 */
  let _resizeIsShift = false;
  /** 旋转起始向量 */
  let _rotateStartVector = {
    x: 0,
    y: 0,
  };
  /** 旋转中心点 */
  let _rotateCenter = {
    x: 0,
    y: 0,
  };
  const _state = {
    get selected() {
      return _selected;
    },
  };
  enum Events {
    Select,
    Unselect,
    StartDrag,
    Dragging,
    FinishDrag,
    CursorChange,
    Change,
  }
  type TheTypesOfEvents = {
    [Events.Select]: void;
    [Events.Unselect]: void;
    [Events.StartDrag]: { x: number; y: number };
    [Events.Dragging]: { x: number; y: number; dx: number; dy: number };
    [Events.CursorChange]: CursorType;
    [Events.FinishDrag]: { x: number; y: number };
    [Events.Change]: typeof _state;
  };
  const bus = base<TheTypesOfEvents>();

  if (props.options.onCursorChange) {
    bus.on(Events.CursorChange, props.options.onCursorChange);
  }

  return {
    state: _state,
    /** 绑定一个平台节点 */
    bindNode(node: unknown) {
      _node = node;
    },
    get client() {
      // console.log("return client", _tmpClient, _client);
      if (_tmpClient) {
        return _tmpClient;
      }
      return _client;
    },
    updateClient(shape: RectShape) {
      _client = shape;
    },
    buildEdgeOfBox() {
      const extra = _tmpClient;
      const rect = extra
        ? {
            x: extra.x,
            y: extra.y,
            x1: extra.x1,
            y1: extra.y1,
          }
        : {
            x: _client.x,
            y: _client.y,
            x1: _client.x1,
            y1: _client.y1,
          };
      const squareSize = 7;
      const halfSize = squareSize / 2;
      // 矩形的四个角
      const corners: { x: number; y: number; key: CursorType }[] = [
        { x: rect.x, y: rect.y, key: "left-top-edge" },
        { x: rect.x1, y: rect.y, key: "right-top-edge" },
        { x: rect.x, y: rect.y1, key: "left-bottom-edge" },
        { x: rect.x1, y: rect.y1, key: "right-bottom-edge" },
      ];
      const squares = corners.map((corner) => {
        return {
          key: corner.key,
          x: corner.x - halfSize,
          y: corner.y - halfSize,
          x1: corner.x + halfSize,
          y1: corner.y + halfSize,
          center: {
            x: corner.x,
            y: corner.y,
          },
        };
      });
      return squares;
    },
    calcCursorPosition(pos: { x: number; y: number }): { type: CursorType } | null {
      // console.log("[BIZ]canvas/object - calcCursorPosition", _client);
      const { x, y } = pos;
      const { x: boxX, y: boxY, x1: right, y1: bottom } = _client;
      const boxX1 = right;
      const boxY1 = bottom;
      const topEdge = boxY;
      const bottomEdge = boxY1;
      const leftEdge = boxX;
      const rightEdge = boxX1;
      const edgeBoxes = this.buildEdgeOfBox();
      const edgeMargin = 8;
      for (let i = 0; i < edgeBoxes.length; i += 1) {
        const box = edgeBoxes[i];
        const { key, x: edgeX, y: edgeY, x1: edgeX1, y1: edgeY1 } = box;
        if (
          x >= edgeX - edgeMargin &&
          x <= edgeX1 + edgeMargin &&
          y >= edgeY - edgeMargin &&
          y <= edgeY1 + edgeMargin
        ) {
          return { type: key as CursorType };
        }
        const rotateBox: null | { key: CursorType; x: number; y: number; x1: number; y1: number } = (() => {
          if (key === "left-bottom-edge") {
            return {
              key: "left-bottom-rotate",
              x: edgeX - edgeMargin - edgeMargin,
              y: edgeY1,
              x1: edgeX,
              y1: edgeY1 + edgeMargin + edgeMargin,
            };
          }
          if (key === "left-top-edge") {
            return {
              key: "left-top-rotate",
              x: edgeX - edgeMargin - edgeMargin,
              y: edgeY - edgeMargin - edgeMargin,
              x1: edgeX,
              y1: edgeY,
            };
          }
          if (key === "right-top-edge") {
            return {
              key: "right-top-rotate",
              x: edgeX1,
              y: edgeY - edgeMargin - edgeMargin,
              x1: edgeX + edgeMargin + edgeMargin,
              y1: edgeY,
            };
          }
          if (key === "right-bottom-edge") {
            return {
              key: "right-bottom-rotate",
              x: edgeX1,
              y: edgeY1,
              x1: edgeX1 + edgeMargin + edgeMargin,
              y1: edgeY1 + edgeMargin + edgeMargin,
            };
          }
          return null;
        })();
        if (rotateBox && x > rotateBox.x && x < rotateBox.x1 && y > rotateBox.y && y < rotateBox.y1) {
          return { type: rotateBox.key };
        }
      }
      const sideMargin = 8;
      if (Math.abs(y - topEdge) <= sideMargin && x >= leftEdge && x <= rightEdge) {
        return { type: "top-side" };
      }
      if (Math.abs(y - bottomEdge) <= sideMargin && x >= leftEdge && x <= rightEdge) {
        return { type: "bottom-side" };
      }
      if (Math.abs(x - leftEdge) <= sideMargin && y >= topEdge && y <= bottomEdge) {
        return { type: "left-side" };
      }
      if (Math.abs(x - rightEdge) <= sideMargin && y >= topEdge && y <= bottomEdge) {
        return { type: "right-side" };
      }
      return null;
    },
    checkInBox(pos: { x: number; y: number }) {
      return checkPosInBox(pos, _client);
    },
    handleMouseDown(pos: { x: number; y: number }) {
      _click_time = new Date().valueOf();
      this.startDrag(pos);
      this.select();
    },
    handleMouseMove(pos: { x: number; y: number }) {
      if (!_pressing) {
        const cursor = this.calcCursorPosition(pos);
        if (cursor) {
          // console.log("[BIZ]canvas/object - handleMouseMove", cursor);
          bus.emit(Events.CursorChange, cursor.type);
          return;
        }
        bus.emit(Events.CursorChange, "select-default");
        return;
      }
      this.drag(pos);
    },
    handleMouseUp(pos: { x: number; y: number }) {
      // console.log("[BIZ]canvas/object - handleMouseUp", _dragging);
      this.endDrag(pos);
    },
    select() {
      _selected = true;
      bus.emit(Events.Select);
    },
    unselect() {
      _selected = false;
      bus.emit(Events.Unselect);
    },
    /** 开始拖动 */
    startDrag(pos: Position) {
      const { onStartPress } = _options;
      if (onStartPress) {
        onStartPress();
      }
      if (_locking) {
        return _client;
      }
      _tmpClient = { ..._client };
      // console.log("[DOMAIN]RectAnimationStore - start drag", this.tmpClient.left);
      const { x, y } = pos;
      _pressing = true;
      _initialX = x;
      _initialY = y;
      _invokedDragStart = false;
      bus.emit(Events.StartDrag, { x, y });
    },
    /** 拖动 */
    drag(
      pos: Position & {
        /** 可拖动的角度 */
        enabledAngle?: number;
      }
    ) {
      _moving = true;
      // console.log("[DOMAIN]TransformRect - drag");
      if (_locking) {
        return _client;
      }
      if (!_pressing) {
        return;
      }
      const { onStartDrag, onDrag } = _options;
      if (!_invokedDragStart && onStartDrag) {
        _invokedDragStart = true;
        onStartDrag(this);
      }
      _dragging = true;
      const { x, y, enabledAngle } = pos;
      const deltaX = x - _initialX;
      const deltaY = y - _initialY;
      // console.log("[DOMAIN]RectAnimationStore - drag", this.rect.left);
      const { x: left, y: top, x1, y1, angle } = _client;
      const targetRect = {
        // x:
        //   left +
        //   (() => {
        //     // @todo 支持锁定某个角度拖动
        //     if (enabledAngle === undefined) {
        //       return deltaX;
        //     }
        //     return 0;
        //   })(),
        x: left + deltaX,
        y: top + deltaY,
        x1: x1 + deltaX,
        y1: y1 + deltaY,
        width: 0,
        height: 0,
        center: {
          x: 0,
          y: 0,
        },
        index: _client.index,
        angle,
      };
      _tmpClient = targetRect;
      // console.log("[BIZ]canvas/object - dragging", _tmpClient.x, left, deltaX);
      // _initialX = x;
      // _initialY = y;
      // if (onDrag) {
      //   const updatedRect = onDrag(targetRect, {
      //     x: deltaX,
      //     y: deltaY,
      //   });
      //   // console.log("[DOMAIN]TransformRect - drop");
      //   this.setPositionButNotUpdateClient({
      //     x: updatedRect.left,
      //     y: updatedRect.top,
      //   });
      //   return updatedRect;
      // }
      // this.setPosition({
      //   x: targetRect.x,
      //   y: targetRect.y,
      // });
      bus.emit(Events.Dragging, { x, y, dx: deltaX, dy: deltaY });
      return targetRect;
    },
    /** 结束拖动 */
    endDrag(pos: { x: number; y: number }) {
      const { onEndDrag, onEndPress } = _options;
      _pressing = false;
      if (onEndPress) {
        onEndPress();
      }
      if (!_tmpClient) {
        return;
      }
      _initialX = 0;
      _initialY = 0;
      // _client = { ..._values };
      _client = _tmpClient;
      const diff = this.compare(_client, _tmpClient);
      _tmpClient = null;
      if (_dragging === false) {
        return;
      }
      _dragging = false;
      if (onEndDrag) {
        onEndDrag({
          diff,
        });
      }
      bus.emit(Events.FinishDrag);
    },
    startResize(options: { x: number; y: number; type: string; isShift: boolean }) {
      const { onStartPress } = _options;
      if (onStartPress) {
        onStartPress();
      }
      //     console.log("[DOMAIN]RectAnimation - start resize", this.rect);
      const { x, y, type, isShift } = options;
      _pressing = true;
      _tmpClient = { ..._client };
      _initialX = x;
      _initialY = y;
      _resizeType = type;
      _resizeIsShift = isShift;
    },
    resize(options: { x: number; y: number; isShift: boolean }) {
      //     console.log("[DOMAIN]RectAnimation - resize");
      if (!_pressing) {
        return _client;
      }
      if (_resizeType === undefined) {
        return _client;
      }
      _resizing = true;
      const { x, y, isShift } = options;
      _resizeIsShift = isShift;
      /** 水平方向上移动的距离 */
      const deltaX = x - _initialX;
      // console.log("[]deltaX", deltaX);
      /** 垂直方向上移动的距离 */
      const deltaY = y - _initialY;
      /** 角度值？https://www.jianshu.com/p/9817e267925a */
      const alpha = Math.atan2(deltaY, deltaX);
      /** 直角三角形中，a2 + b2 = c2，由于移动的鼠标点总可以和原点画直角三角形，所以 deltaL 就是鼠标距离原点的距离 */
      const deltaL = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const length = deltaL;
      // @todo
      const parentRotateAngle = 0;
      const beta = alpha - degToRadian(_client.angle + parentRotateAngle);
      // console.log("[]beta", beta, degToRadian(rotateAngle + parentRotateAngle));
      // length 是三角形斜边，乘以 Math.cos(beta) 就能知道在水平方向上移动的距离
      const deltaW = length * Math.cos(beta);
      // console.log("deltaW", deltaW);
      // 同理，deltaH 就是在垂直方向上移动的距离
      const deltaH = length * Math.sin(beta);
      const ratio = _resizeIsShift && !_options.ratio ? _client.width / _client.height : _options.ratio;
      //     console.log("[DOMAIN]RectAnimation - result", this.rect);
      const { position, size } = calcNewStyleOfTransformingBox(
        _resizeType,
        {
          width: _client.width,
          height: _client.height,
          angle: _client.angle,
          centerX: _client.x + _client.width / 2,
          centerY: _client.y + _client.height / 2,
        },
        deltaW,
        deltaH,
        ratio,
        _options.minWidth,
        _options.minHeight
      );
      // console.log("[DOMAIN]RectAnimation - result", position, size);
      const result = {
        x: position.centerX - size.width / 2,
        y: position.centerY - size.height / 2,
        x1: position.centerX - size.width / 2 + size.width,
        y1: position.centerY - size.height / 2 + size.height,
        width: size.width,
        height: size.height,
        angle: _client.angle,
        index: _client.index,
      };
      // console.log("[DOMAIN]RectAnimation - result", result);
      _tmpClient = this.completeRect({ ...result });
      //       this.values = { ...this.tmpRect };
      //       this.emitValuesChange();
      return result as RectShape;
    },
    endResize() {
      const { onEndResize, onEndPress } = _options;
      _pressing = false;
      if (onEndPress) {
        onEndPress();
      }
      if (!_tmpClient) {
        return;
      }
      _initialX = 0;
      _initialY = 0;
      const result = _tmpClient;
      if (result === null) {
        return;
      }
      _client = this.completeRect({ ...result });
      //       this.values = { ...this.client };
      //       this.emitValuesChange();
      if (_resizing === false) {
        return;
      }
      const diff = this.compare(_client, _tmpClient);
      _tmpClient = { ..._client };
      if (onEndResize) {
        onEndResize({ diff });
      }
    },
    startRotate(options: { x: number; y: number; left: number; top: number; width: number; height: number }) {
      const { onStartPress } = _options;
      if (onStartPress) {
        onStartPress();
      }
      const { x, y, left, top, width, height } = options;
      const center = {
        x: left + width / 2,
        y: top + height / 2,
      };
      const startVector = {
        x: x - center.x,
        y: y - center.y,
      };
      _rotateStartVector = startVector;
      _rotateCenter = center;
      _pressing = true;
    },
    rotate(options: { x: number; y: number }) {
      if (!_pressing) {
        return _client;
      }
      _rotating = true;
      const { x, y } = options;
      const center = _rotateCenter;
      const rotateVector = {
        x: x - center.x,
        y: y - center.y,
      };
      const relativeAngle = getAngle(_rotateStartVector, rotateVector);
      const startAngle = _client.angle;
      let rotateAngle = Math.round(relativeAngle + startAngle);
      if (rotateAngle >= 360) {
        rotateAngle -= 360;
      } else if (rotateAngle < 0) {
        rotateAngle += 360;
      }
      if (rotateAngle > 356 || rotateAngle < 4) {
        rotateAngle = 0;
      } else if (rotateAngle > 86 && rotateAngle < 94) {
        rotateAngle = 90;
      } else if (rotateAngle > 176 && rotateAngle < 184) {
        rotateAngle = 180;
      } else if (rotateAngle > 266 && rotateAngle < 274) {
        rotateAngle = 270;
      }
      _tmpClient = this.completeRect({
        ..._client,
        angle: rotateAngle,
      });
      //       this.values = { ...this.tmpRect };
      //       this.emitValuesChange();
      return _tmpClient;
    },
    endRotate() {
      const { onEndRotate, onEndPress } = _options;
      _pressing = false;
      if (onEndPress) {
        onEndPress();
      }
      _initialX = 0;
      _initialY = 0;
      if (_tmpClient === null) {
        return;
      }
      _client = this.completeRect({ ..._tmpClient });
      //       this.values = { ...this.client };
      //       this.emitValuesChange();
      if (_rotating === false) {
        return;
      }
      const diff = this.compare(_client, _tmpClient);
      _tmpClient = { ..._client };
      if (onEndRotate) {
        onEndRotate({
          diff,
        });
      }
    },
    /**
     * 改变 rect 宽高
     */
    setSize(size: Size) {
      const { width, height } = size;
      _client = this.completeRect({
        ..._client,
        width,
        height,
      });
      //       this.values = { ...this.client };
      //       this.emitValuesChange();
    },
    /**
     * 改变 rect 位置
     * @param {Position} pos - 移动到指定的位置
     * @param {boolean} pos.wait - 是否不执行 emitValuesChange，等待其他地方
     */
    setPosition(
      pos: Position & {
        wait?: boolean;
      }
    ) {
      const { x, y, wait = false } = pos;
      _client = this.completeRect({
        ..._client,
        x: x,
        y: y,
      });
    },
    /**
     * 设置位置，但是不改变 client 信息
     * 如果改变了 client 信息，会导致一直吸附参考线
     * 所以在这里，其实出现了两个 rect，一个暴露给外部渲染的，位置是虚假的（吸附了参考线），另一个是根据鼠标位置移动的真实的（只有位置信息并不暴露给外部）
     */
    setPositionButNotUpdateClient(pos: Position) {
      //       this.values = { ...this.client, left: pos.x, top: pos.y };
      //       this.emitValuesChange();
    },
    /**
     * 改变旋转的角度
     */
    setAngle(angle: number) {
      _client = this.completeRect({
        ..._client,
        angle,
      });
      //       this.values = { ...this.client };
      //       this.emitValuesChange();
    },
    setIndex(index: number) {
      _client = this.completeRect({
        ..._client,
        index,
      });
      //       this.values = { ...this.client };
      //       this.emitValuesChange();
    },
    /**
     * 补全 rect
     * 其实只要 left、top、width、height 和 angle，其他值都是根据这四个值推断出来的，属于「派生值」
     */
    completeRect(partialRect: Partial<RectShape>): RectShape {
      const { x: left = 0, y: top = 0, width = 0, height = 0, angle = 0, index = 0 } = partialRect;
      return Object.assign(
        createEmptyRectShape(),
        { ..._client },
        {
          x: left,
          y: top,
          x1: left + width,
          y1: top + height,
          center: {
            x: left + width / 2,
            y: top + height / 2,
          },
          width,
          height,
          angle,
          index,
        }
      );
    },
    /** 锁定，禁用移动、放大等所有转换操作 */
    lock() {
      _locking = true;
    },
    /** 释放锁定 */
    releaseLock() {
      _locking = false;
    },
    /** 比较两个 rect 形变的差异 */
    compare(curClient: RectShape, prevClient: RectShape) {
      const { x: left, y: top, width, height, angle } = curClient;
      const { x: prevLeft, y: prevTop, width: prevWidth, height: prevHeight, angle: prevAngle } = prevClient;
      return this.completeRect({
        x: left - prevLeft,
        y: top - prevTop,
        width: width - prevWidth,
        height: height - prevHeight,
        angle: angle - prevAngle,
      });
    },

    onSelect(handler: Handler<TheTypesOfEvents[Events.Select]>) {
      return bus.on(Events.Select, handler);
    },
    onUnselect(handler: Handler<TheTypesOfEvents[Events.Unselect]>) {
      return bus.on(Events.Unselect, handler);
    },
    onStartDrag(handler: Handler<TheTypesOfEvents[Events.StartDrag]>) {
      return bus.on(Events.StartDrag, handler);
    },
    onDragging(handler: Handler<TheTypesOfEvents[Events.Dragging]>) {
      return bus.on(Events.Dragging, handler);
    },
    onFinishDrag(handler: Handler<TheTypesOfEvents[Events.FinishDrag]>) {
      return bus.on(Events.FinishDrag, handler);
    },
    onCursorChange(handler: Handler<TheTypesOfEvents[Events.CursorChange]>) {
      return bus.on(Events.CursorChange, handler);
    },
  };
}

export type CanvasObject = ReturnType<typeof CanvasObject>;
