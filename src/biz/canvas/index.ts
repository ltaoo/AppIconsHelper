import { base, Handler } from "@/domains/base";
import { Line } from "@/biz/line";
import { toFixPoint } from "@/biz/bezier_point/utils";
import { LinearGradientPayload } from "@/biz/svg/path-parser";

import { CanvasLayer } from "./layer";
import { Position } from "./types";
import { CanvasRangeSelection } from "./range";
import { CursorType } from "./constants";
import { buildPath, opentypeCommandsToTokens } from "./utils";
import { CanvasConverter } from "./converter";
import { CanvasPointer } from "./mouse";
import { CanvasModeManage, StatusKeyType, StatusKeys } from "./mode";
import { PathEditing } from "./path_editing";
import { CanvasObject } from "./object";

const debug = false;

type CanvasProps = {
  grid: {
    width: number;
    height: number;
    unit: number;
  };
};
export function Canvas(props: CanvasProps) {
  let _mounted = false;
  const _layers: {
    range: CanvasLayer;
    grid: CanvasLayer;
    path: CanvasLayer;
    graph: CanvasLayer;
    background: CanvasLayer;
  } = {
    // 绘制了选框
    range: CanvasLayer({
      zIndex: 999,
      disabled: true,
    }),
    // 绘制了网格线
    grid: CanvasLayer({
      zIndex: 998,
      disabled: true,
      onMounted(layer) {
        // layer.drawGrid(() => {
        //   console.log("The Grid has Draw");
        // });
      },
    }),
    // 绘制了锚点、路径
    path: CanvasLayer({
      zIndex: 99,
    }),
    // 绘制了填充、描边
    graph: CanvasLayer({
      zIndex: 9,
    }),
    background: CanvasLayer({
      zIndex: 1,
      onMounted(layer) {
        layer.drawTransparentBackground();
      },
    }),
  };
  let _cur_layer = _layers.graph;
  let _size = {
    width: 0,
    height: 0,
  };
  let _dpr = 1;
  /** 网格区域信息 */
  let _grid = {
    x: 0,
    y: 0,
    width: props.grid.width,
    height: props.grid.height,
    unit: props.grid.unit,
    lineWidth: 0.5,
    color: "#cccccc",
  };
  let _gradients: LinearGradientPayload[] = [];
  /** 画布上的图形 */
  let _objects: CanvasObject[] = [];
  /** 当前选择的图形 */
  let _cur_object: null | Line = null;
  /** 画布上的图形 */
  let _lines: Line[] = [];
  let _cursor: CursorType = "select-default";
  let _debug = false;

  const _$mode = CanvasModeManage({
    state: "default.select",
    onChange(v) {
      _cursor = (() => {
        if (v === "path_editing.pen") {
          return "pen-edit";
        }
        if (v === "path_editing.close_path") {
          return "pen-close-path";
        }
        if (v === "path_editing.select") {
          return "select-default";
        }
        return "select-default";
      })();
    },
  });

  const _state = {
    get cursor() {
      return _cursor;
    },
    get mode() {
      return _$mode.value;
    },
  };

  enum Events {
    /** 重新绘制 canvas 内容 */
    Refresh,
    Mounted,
    Change,
  }
  type TheTypesOfEvents = {
    [Events.Refresh]: void;
    [Events.Mounted]: void;
    [Events.Change]: typeof _state;
  };
  // 事件
  const bus = base<TheTypesOfEvents>();

  const ins = {
    SymbolTag: "Canvas" as const,
    state: _state,
    get layers() {
      return _layers;
    },
    get layerList() {
      return Object.keys(_layers).map((name) => {
        // @ts-ignore
        return _layers[name];
      });
    },
    get $selection() {
      return _$selection;
    },
    get paths() {
      return _lines;
    },
    get object() {
      return _cur_object;
    },
    isMode(v: StatusKeys) {
      return _$mode.is(v);
    },
    createLayer() {},
    // appendLayer(layer: CanvasLayer) {
    //   if (_layers.includes(layer)) {
    //     return;
    //   }
    //   _layers.push(layer);
    // },
    /** 图形绘制层 */
    get layer() {
      return _cur_layer;
    },
    get size() {
      return _size;
    },
    setSize(size: { width: number; height: number }) {
      Object.assign(_size, size);
    },
    get mounted() {
      return _mounted;
    },
    setMounted() {
      _mounted = true;
      bus.emit(Events.Mounted);
    },
    setDPR(v: number) {
      _dpr = v;
    },
    get grid() {
      return _grid;
    },
    setGrid(grid: { x: number; y: number; width?: number; height?: number }) {
      Object.assign(_grid, grid);
    },
    /**
     * 钢笔工具
     * 对锚点进行选择、移动
     */
    selectPathEditingSelect() {
      _$mode.set("path_editing.select");
      _$path_editing.startSelect();
      bus.emit(Events.Refresh);
      bus.emit(Events.Change, { ..._state });
    },
    /**
     * 钢笔工具
     * 切换回钢笔工具，表示对锚点进行编辑
     */
    selectPathEditingPen() {
      if (_cur_object) {
        _cur_object.unselect();
        _cur_object = null;
      }
      _$mode.set("path_editing.pen");
      bus.emit(Events.Refresh);
      bus.emit(Events.Change, { ..._state });
    },
    /**
     * 画布模式
     * 对画布上的物体进行位置、大小等属性调整
     */
    selectDefaultSelect() {
      _$mode.set("default.select");
      _$path_editing.complete();
      bus.emit(Events.Refresh);
      bus.emit(Events.Change, { ..._state });
    },
    /**
     * 画布模式
     * 选择钢笔工具，表示要绘制新的线条
     */
    selectDefaultPen() {
      console.log("[BIZ]canvas/index - selectDefaultPen");
      if (_cur_object) {
        _cur_object.unselect();
        _cur_object = null;
      }
      _$mode.set("path_editing.pen");
      _$path_editing.clear();
      bus.emit(Events.Refresh);
      bus.emit(Events.Change, { ..._state });
    },
    handleKeyupBackspace() {
      // console.log("[BIZ]canvas/index - handleKeyupBackspace");
      if (_$mode.is("default.select")) {
        if (_cur_object) {
          _lines = _lines.filter((l) => l !== _cur_object);
        }
        bus.emit(Events.Refresh);
        return;
      }
      if (_$mode.is("path_editing.select")) {
        // console.log("[BIZ]canvas/index - handleKeyupBackspace before deleteCurPoint");
        _$path_editing.deleteCurPoint();
      }
    },
    tagCurObjectAsCopy() {
      //
    },
    /**
     * 检查是否有靠近可以吸附的线条
     */
    // checkAttachLinesBeforeDrag(curRect: RectShape): [RectShape, LineShape[]] {
    //   const { things: contents } = this.values;
    //   const rectLines: LineShape[] = [];
    //   if (this.client === null) {
    //     return [curRect, []];
    //   }
    //   const { width, height } = this.client;
    //   const [nextRect, lines] = findNearbyLinesAtRect(
    //     curRect,
    //     rectLines.concat([
    //       {
    //         type: LineDirectionTypes.Horizontal,
    //         origin: 0,
    //         y: height / 2,
    //         length: width,
    //       },
    //       {
    //         type: LineDirectionTypes.Vertical,
    //         origin: 0,
    //         x: width / 2,
    //         length: height,
    //       },
    //     ])
    //   );
    //   return [nextRect, lines];
    // },
    saveGradients(gradients: LinearGradientPayload[]) {
      console.log("[BIZ]canvas/index - saveGradient", _gradients);
      _gradients = gradients;
    },
    getGradient(id: string) {
      console.log("[BIZ]canvas/index - getGradient", id, _gradients);
      return _gradients.find((g) => g.id === id);
    },
    appendObject(
      paths: Line[],
      extra: Partial<{ transform: boolean; dimensions: { width: number; height: number } }> = {}
    ) {
      _lines = paths;
      // _lines = this.format(paths);
      // _paths = _lines.reduce((prev, cur) => {
      //   return prev.concat(cur.paths);
      // }, [] as LinePath[]);
    },
    inGrid(pos: { x: number; y: number }) {
      if (pos.x >= _grid.x && pos.x <= _grid.x + _grid.width && pos.y >= _grid.y && pos.y <= _grid.y + _grid.height) {
        return true;
      }
      return false;
    },
    buildBezierPathsFromOpentype(...args: Parameters<typeof _$converter.buildBezierPathsFromOpentype>) {
      return _$converter.buildBezierPathsFromOpentype(...args);
    },
    buildBezierPathsFromPathString(...args: Parameters<typeof _$converter.buildBezierPathsFromPathString>) {
      return _$converter.buildBezierPathsFromPathString(...args);
    },
    buildWeappCode() {
      return _$converter.buildWeappCode(_lines);
    },
    buildPreviewIcons() {
      return _$converter.buildPreviewIcons(_lines);
    },
    update() {
      bus.emit(Events.Refresh);
    },
    get debug() {
      return _debug;
    },
    setDebug() {
      _debug = !_debug;
    },
    log() {
      if (_cur_layer) {
        const content = _cur_layer.logs.join("\n");
        console.log(content);
      }
    },
    handleMouseDown(pos: { x: number; y: number }) {
      // const pos = toFixPoint(event);
      // _$selection.setPressing(true);
      _$pointer.handleMouseDown(pos);
      if (_$mode.value === "default.select") {
        // 检查是否点中了画布上的物体，如果是，就开始移动
        const clicked = (() => {
          for (let i = 0; i < _lines.length; i += 1) {
            const is = _lines[i].inBox(pos);
            if (is) {
              return _lines[i];
            }
          }
          return null;
        })();
        console.log("[BIZ]canvas/index - before if(clicked", clicked, _cur_object, clicked === _cur_object);
        if (clicked) {
          if (_cur_object) {
            if (_cur_object !== clicked) {
              console.log("[BIZ]canvas/index - before _cur_object.unselect");
              _cur_object.unselect();
              _cur_object = null;
            }
          }
          _cur_object = clicked;
          _cur_object.handleMouseDown(pos);
          return;
        }
        if (_cur_object) {
          _cur_object.unselect();
          _cur_object = null;
        }
        _$selection.startRangeSelect(pos);
      }
      if (_$mode.is("path_editing")) {
        _$path_editing.handleMouseDown(pos);
      }
    },
    handleMouseMove(pos: { x: number; y: number }) {
      // const pos = toFixPoint(event);
      // console.log("[BIZ]canvas/index - handleMouseMove", _cur_object);
      _$pointer.handleMouseMove(pos);
      if (_cur_object) {
        _cur_object.handleMouseMove(pos);
        return;
      }
      if (_$mode.value === "default.select") {
        _$selection.rangeSelect(pos);
      }
      if (["path_editing.pen", "path_editing.select"].includes(_$mode.value)) {
        _$path_editing.handleMouseMove(pos);
      }
    },
    handleMouseUp(pos: { x: number; y: number }) {
      // const pos = toFixPoint(event);
      (() => {
        if (_cur_object) {
          _cur_object.handleMouseUp(pos);
          // _cur_object = null;
          return;
        }
        if (_state.mode === "default.select") {
          _$selection.endRangeSelect();
        }
        if (_$mode.is("path_editing")) {
          _$path_editing.handleMouseUp(pos);
        }
      })();
      _$pointer.handleMouseUp(pos);
    },
    onRefresh(handler: Handler<TheTypesOfEvents[Events.Refresh]>) {
      return bus.on(Events.Refresh, handler);
    },
    onMounted(handler: Handler<TheTypesOfEvents[Events.Mounted]>) {
      return bus.on(Events.Mounted, handler);
    },
    onChange(handler: Handler<TheTypesOfEvents[Events.Change]>) {
      return bus.on(Events.Change, handler);
    },
  };

  const _$converter = CanvasConverter({ grid: _grid });
  const _$pointer = CanvasPointer({ canvas: ins, mode: _$mode });
  const _$selection = CanvasRangeSelection({ pointer: _$pointer });
  const _$path_editing = PathEditing({ canvas: ins, pointer: _$pointer, mode: _$mode });
  _$pointer.onDoubleClick((pos) => {
    const matched = (() => {
      for (let i = 0; i < _lines.length; i += 1) {
        const line = _lines[i];
        const inBox = line.inBox(pos);
        if (inBox) {
          return line;
        }
      }
      return null;
    })();
    if (!matched) {
      return;
    }
    _$path_editing.setLine(matched);
    _cur_object = null;
    matched.unselect();
    matched.setEditing(true);
    _$mode.set("path_editing.select");
    bus.emit(Events.Refresh);
    bus.emit(Events.Change, { ..._state });
  });
  _$path_editing.onCreateLine((line) => {
    line.onSelect(() => {
      bus.emit(Events.Refresh);
    });
    line.onUnselect(() => {
      console.log("[BIZ]canvas/index - line.onUnselect");
      bus.emit(Events.Refresh);
    });
    line.onDragging(() => {
      bus.emit(Events.Refresh);
    });
    line.onCursorChange((v) => {
      if (_cursor === v) {
        return;
      }
      _cursor = v;
      bus.emit(Events.Change, { ..._state });
    });
    // line.onDoubleClick(() => {
    //   bus.emit(Events.Refresh);
    // });
    _lines.push(line);
  });
  _$path_editing.onCursorChange((v) => {
    if (_cursor === v) {
      return;
    }
    _cursor = v;
    bus.emit(Events.Change, { ..._state });
  });
  _$path_editing.onRefresh(() => {
    bus.emit(Events.Refresh);
  });

  return ins;
}

export type Canvas = ReturnType<typeof Canvas>;
