/**
 * @file 首页
 */
import { createSignal, For, onMount, Show } from "solid-js";
import { Copy } from "lucide-solid";
import { saveAs } from "file-saver";
import i18next from "i18next";
import JSZip from "jszip";
import { createICNS, createICO, clearCache } from "png2icons";

import { ViewComponent, ViewComponentProps } from "@/store/types";
import { connect, connectLayer } from "@/biz/canvas/connect.web";
import { Canvas } from "@/biz/canvas";
import { base, Handler } from "@/domains/base";
import { DragZoneCore } from "@/domains/ui/drag-zone";
import { DropArea } from "@/components/ui/drop-area";
import { blobToArrayBuffer, loadImage } from "@/utils/browser";
import { TabHeader } from "@/components/ui/tab-header";
import { TabHeaderCore } from "@/domains/ui/tab-header";
import { Button } from "@/components/ui";

function HomeIndexPageCore(props: ViewComponentProps) {
  const { app } = props;

  let _file: null | { name: string; buffer: ArrayBuffer; url: string } = null;
  let _icons: ReturnType<typeof $$canvas.buildPreviewIcons> = [];
  let _code = "";
  const TAURI_ICONS_SIZE_LIST = [
    { name: "32x32", suffix: "png", width: 32, height: 32 },
    { name: "128x128", suffix: "png", width: 128, height: 128 },
    { name: "128x128@2x", suffix: "png", width: 128, height: 128, scale: 2 },
    { name: "StoreLogo", suffix: "png", width: 50, height: 50 },
    { name: "Square30x30Logo", suffix: "png", width: 30, height: 30 },
    { name: "Square44x44Logo", suffix: "png", width: 44, height: 44 },
    { name: "Square71x71Logo", suffix: "png", width: 71, height: 71 },
    { name: "Square89x89Logo", suffix: "png", width: 89, height: 89 },
    { name: "Square107x107Logo", suffix: "png", width: 107, height: 107 },
    { name: "Square142x142Logo", suffix: "png", width: 142, height: 142 },
    { name: "Square150x150Logo", suffix: "png", width: 150, height: 150 },
    { name: "Square284x284Logo", suffix: "png", width: 284, height: 284 },
    { name: "Square310x310Logo", suffix: "png", width: 310, height: 310 },
    { name: "icon", suffix: "png", width: 512, height: 512 },
    { name: "icon", suffix: "ico", width: 512, height: 512 },
    { name: "icon", suffix: "icns", width: 512, height: 512 },
  ];
  function preview() {
    const result = $$canvas.buildPreviewIcons();
    if (result.length === 0) {
      app.tip({
        text: ["无法预览，没有内容"],
      });
      return;
    }
    // setIcons(result);
    _icons = result;
    bus.emit(Events.Change, { ...state });
  }

  function draw() {
    // console.log("[PAGE]index/index - draw", $$canvas.paths.length);
    const $graph_layer = $$canvas.layer;
    const $pen_layer = $$canvas.layers.path;
    $graph_layer.clear();
    $pen_layer.clear();
    $graph_layer.emptyLogs();
    // $$layer.resumeLog();
    // if ($$canvas.debug) {
    //   const m = $$canvas.getMousePoint();
    //   $$layer.setFillStyle("black");
    //   $$layer.setFont("10px Arial");
    //   $$layer.fillText(m.text, m.x, m.y);
    // }
    // console.log("[PAGE]before render $$canvas.paths", $$canvas.paths);
    for (let i = 0; i < $$canvas.paths.length; i += 1) {
      (() => {
        const $$prev_path = $$canvas.paths[i - 1];
        const $$path = $$canvas.paths[i];
        const state = $$path.state;
        // console.log("before $$path.state.stroke.enabled", state.stroke.enabled);
        if (state.stroke.enabled) {
          // 绘制描边
          // const curves = $$path.buildOutline({ cap: "butt" });
          // ctx.save();
          // ctx.beginPath();
          // for (let i = 0; i < curves.outline.length; i += 1) {
          //   const curve = curves.outline[i];
          //   const [start, c1, c2, end] = curve.points;
          //   const next = curves.outline[i + 1];
          //   if (i === 0 && start) {
          //     ctx.moveTo(start.x, start.y);
          //   }
          //   (() => {
          //     if (curve._linear) {
          //       const last = curve.points[curve.points.length - 1];
          //       ctx.lineTo(last.x, last.y);
          //       return;
          //     }
          //     if (end) {
          //       ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
          //       return;
          //     }
          //     ctx.quadraticCurveTo(c1.x, c1.y, c2.x, c2.y);
          //   })();
          // }
          // ctx.closePath();
          // ctx.fillStyle = $$path.state.stroke.color;
          // ctx.fill();
          // ctx.strokeStyle = state.stroke.color;
          // ctx.lineWidth = $$canvas.grid.unit * state.stroke.width;
          // ctx.lineCap = state.stroke.start_cap;
          // ctx.lineJoin = state.stroke.join;
          // ctx.stroke();
          // ctx.restore();
        }
        // 绘制路径
        console.log("[PAGE]home/index render $$canvas.paths");
        for (let j = 0; j < $$path.paths.length; j += 1) {
          const $sub_path = $$path.paths[j];
          const commands = $sub_path.buildCommands();
          $graph_layer.save();
          for (let i = 0; i < commands.length; i += 1) {
            const prev = commands[i - 1];
            const command = commands[i];
            const next_command = commands[i + 1];
            // console.log("[PAGE]command", command.c, command.a);
            if (command.c === "M") {
              const [x, y] = command.a;
              // 这两个的顺序影响很大？？？？？如果开头是弧线，就不能使用 moveTo；其他情况都可以先 beginPath 再 moveTo
              $graph_layer.beginPath();
              $graph_layer.moveTo(x, y);
              $pen_layer.beginPath();
              $pen_layer.moveTo(x, y);
            }
            if (command.c === "A") {
              // console.log('A', command);
              const [c1x, c1y, radius, angle1, angle2, counterclockwise] = command.a;
              $graph_layer.arc(c1x, c1y, radius, angle1, angle2, Boolean(counterclockwise));
              $pen_layer.arc(c1x, c1y, radius, angle1, angle2, Boolean(counterclockwise));
              // if (command.end) {
              //   ctx.moveTo(command.end.x, command.end.y);
              // }
            }
            if (command.c === "C") {
              const [c1x, c1y, c2x, c2y, ex, ey] = command.a;
              $graph_layer.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
              $pen_layer.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
              // if (command.p) {
              //   ctx.moveTo(command.p.x, command.p.y);
              // }
            }
            if (command.c === "Q") {
              const [c1x, c1y, ex, ey] = command.a;
              $graph_layer.quadraticCurveTo(c1x, c1y, ex, ey);
              $pen_layer.quadraticCurveTo(c1x, c1y, ex, ey);
            }
            if (command.c === "L") {
              const [x, y] = command.a;
              $graph_layer.lineTo(x, y);
              $pen_layer.lineTo(x, y);
            }
            if (command.c === "Z") {
              $graph_layer.closePath();
              $pen_layer.closePath();
            }
          }
          $pen_layer.setStrokeStyle("lightgrey");
          $pen_layer.setLineWidth(1);
          $pen_layer.stroke();
          // console.log("[PAGE]home/index before fill", state.fill);
          if (state.fill.enabled && $sub_path.closed) {
            if ($sub_path.composite === "destination-out") {
              $graph_layer.setGlobalCompositeOperation($sub_path.composite);
            }
            $graph_layer.setFillStyle(state.fill.color);
            // console.log("check is url gradient", state.fill.color, state.fill.color.match(/url\(([^)]{1,})\)/));
            if (state.fill.color.match(/url\(([^)]{1,})\)/)) {
              const [_, id] = state.fill.color.match(/url\(#([^)]{1,})\)/)!;
              const payload = $$canvas.getGradient(id);
              if (payload) {
                const gradient = $graph_layer.getGradient(payload) as CanvasGradient;
                $graph_layer.setFillStyle(gradient);
              }
            }
            $graph_layer.fill();
          }
          // console.log("[PAGE]home/index before stroke", state.stroke);
          if (state.stroke.enabled) {
            $graph_layer.setStrokeStyle(state.stroke.color);
            $graph_layer.setLineWidth($$canvas.grid.unit * state.stroke.width);
            $graph_layer.setLineCap(state.stroke.start_cap);
            $graph_layer.setLineJoin(state.stroke.join);
            $graph_layer.stroke();
          }
          $graph_layer.restore();
          $graph_layer.stopLog();
        }
        if ($$path.selected) {
          const box = $$path.box;
          $pen_layer.drawRect(box);
          const edges = $$path.buildEdgesOfBox();
          for (let i = 0; i < edges.length; i += 1) {
            const edge = edges[i];
            $pen_layer.drawRect(edge, { background: "#ffffff" });
          }
        }
      })();
    }
  }

  const $dragZone = new DragZoneCore();
  $dragZone.onChange(async (files) => {
    const file = files[0];
    const filename = file.name;
    const r = await app.readFile(file);
    if (r.error) {
      app.tip({
        text: [r.error.message],
      });
      return;
    }
    _file = {
      name: filename,
      buffer: r.data,
      url: URL.createObjectURL(file),
    };
    bus.emit(Events.Change, { ...state });
    if (filename.match(/\.svg$/)) {
      const decoder = new TextDecoder("utf-8");
      const content = decoder.decode(r.data);
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "image/svg+xml");
      const svg = doc.getElementsByTagName("svg")[0];
      const result = $$canvas.buildBezierPathsFromPathString(new XMLSerializer().serializeToString(svg));
      if (result === null) {
        app.tip({
          text: ["不是合法的 SVG 内容"],
        });
        return;
      }
      const { dimensions, gradients, paths } = result;
      console.log("[PAGE]home/index svg result from file", filename, dimensions, result);
      $$canvas.saveGradients(gradients);
      $$canvas.appendObject(paths, { transform: true, dimensions });
      draw();
      const $graph_layer = $$canvas.layer;
      const r3 = await $graph_layer.getBlob("image/png");
      if (r3.error) {
        app.tip({
          text: [r3.error.message],
        });
        return;
      }
      _file.buffer = await blobToArrayBuffer(r3.data);
      _file.url = URL.createObjectURL(r3.data);
      return;
    }
    if (filename.match(/\.(png|jpg|jpeg)$/)) {
      const blob = new Blob([r.data], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      const r2 = await loadImage(url);
      if (r2.error) {
        // console.log("[PAGE]home/index load image failed", r2.error);
        app.tip({
          text: [r2.error.message],
        });
        return;
      }
      const $graph_layer = $$canvas.layer;
      const $image = r2.data;
      const scale = Math.min($$canvas.size.width / $image.width, $$canvas.size.height / $image.height);
      const x = ($$canvas.size.width - $image.width * scale) / 2;
      const y = ($$canvas.size.height - $image.height * scale) / 2;
      $graph_layer.clear();
      $graph_layer.drawImage(r2.data, { x, y }, { width: $image.width * scale, height: $image.height * scale });
    }
  });
  const $$canvas = Canvas({
    grid: {
      width: 120,
      height: 120,
      unit: 16,
    },
  });
  const $tabs = new TabHeaderCore({
    options: [
      {
        id: 1,
        text: i18next.t("general"),
      },
      {
        id: 2,
        text: "Tauri",
      },
      {
        id: 3,
        text: "Flutter",
      },
      {
        id: 4,
        text: "Electron",
      },
    ],
    onMounted() {
      $tabs.selectById(1);
    },
  });
  $$canvas.$selection.onChange((state) => {
    const $layer = $$canvas.layers.range;
    // console.log("[PAGE]before drawRect", state);
    $layer.clear();
    $layer.drawRect(state);
  });
  $$canvas.onRefresh(() => {
    draw();
  });
  app.onKeyup(({ code }) => {
    if (code === "Backspace") {
      $$canvas.handleKeyupBackspace();
    }
    if (code === "KeyC" && app.keyboard["ControlLeft"]) {
      $$canvas.tagCurObjectAsCopy();
    }
    if (code === "ControlLeft" && app.keyboard["KeyC"]) {
      $$canvas.tagCurObjectAsCopy();
    }
    if (code === "KeyV" && app.keyboard["ControlLeft"]) {
    }
    if (code === "ControlLeft" && app.keyboard["KeyV"]) {
    }
  });
  const state = {
    get sizeGroups() {
      return [
        {
          label: "通用",
          sizes: TAURI_ICONS_SIZE_LIST,
        },
      ];
    },
    get file() {
      return _file;
    },
    get icons() {
      return _icons;
    },
    get code() {
      return _code;
    },
  };

  enum Events {
    Change,
  }
  type TheTypesOfEvents = {
    [Events.Change]: typeof state;
  };
  const bus = base<TheTypesOfEvents>();

  return {
    state,
    ui: {
      $$canvas,
      $dragZone,
      $tabs,
    },
    preview,
    async validateCanvasImage() {
      const $graph_layer = $$canvas.layer;
      const canvas = $graph_layer.getCanvas() as HTMLCanvasElement;
      const r1 = await $graph_layer.getBlob("image/png");
      if (r1.error) {
        app.tip({
          text: [r1.error.message],
        });
        return;
      }
      const blob = r1.data;
      // const dataURL = canvas.toDataURL("image/png");
      // const binaryString = atob(base64);
      // // 创建一个 Uint8Array 来存储二进制数据
      // const len = binaryString.length;
      // const bytes = new Uint8Array(len);
      // for (let i = 0; i < len; i++) {
      //   bytes[i] = binaryString.charCodeAt(i);
      // }
      // const arrayBuffer = bytes.buffer;
      // const content =
      // saveAs(content, "icons.zip");
    },
    async downloadICO() {
      if (_file === null) {
        return;
      }
      const uint8Array = new Uint8Array(_file.buffer);
      const header = uint8Array.slice(0, 8);
      if (
        !(
          header[0] === 0x89 &&
          header[1] === 0x50 &&
          header[2] === 0x4e &&
          header[3] === 0x47 &&
          header[4] === 0x0d &&
          header[5] === 0x0a &&
          header[6] === 0x1a &&
          header[7] === 0x0a
        )
      ) {
        app.tip({
          text: ["这不是一个有效的PNG文件"],
        });
        return;
      }
      // @ts-ignore
      const r = createICO(_file.buffer);
      clearCache();
      if (r === null) {
        app.tip({
          text: ["生成 ico 失败"],
        });
        return;
      }
      const zip = new JSZip();
      const blob = new Blob([r], { type: "application/octet-stream" });
      zip.file("ttt.ico", blob);
      // Buffer.from(target, target.offset, target.byteLength)
      // const t = globalThis.Buffer.from(new Uint8Array(_file.buffer));
      // console.log(t, t === _file.buffer);
      // @ts-ignore
      const r2 = createICNS(_file.buffer);
      clearCache();
      // const r2 = createICNS(globalThis.Buffer.from(_file.buffer));
      if (r2 === null) {
        app.tip({
          text: ["生成 icns 失败"],
        });
        return;
      }
      const blob2 = new Blob([r2], { type: "application/octet-stream" });
      zip.file("ttt.icns", blob2);
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "icons2.zip");
    },
    async downloadIcoFiles(sizes: { name: string; suffix: string; width: number; height: number; scale?: number }[]) {
      const $graph_layer = $$canvas.layer;
      const canvas = $graph_layer.getCanvas() as HTMLCanvasElement;
      const IMAGE_SCALE = 10;
      const files: { name: string; blob: Blob }[] = [];
      for (const size of sizes) {
        const { name, width, height, scale = 1 } = size;
        const tempCanvas = document.createElement("canvas");
        const scaledWidth = width * IMAGE_SCALE * scale;
        const scaledHeight = height * IMAGE_SCALE * scale;
        tempCanvas.width = scaledWidth;
        tempCanvas.height = scaledHeight;
        const tempCtx = tempCanvas.getContext("2d")!;
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.drawImage(
          canvas,
          $$canvas.grid.x,
          $$canvas.grid.y,
          $$canvas.grid.width,
          $$canvas.grid.height,
          0,
          0,
          scaledWidth,
          scaledHeight
        );
        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = width;
        exportCanvas.height = height;
        const exportCtx = exportCanvas.getContext("2d")!;
        exportCtx.drawImage(tempCanvas, 0, 0, scaledWidth, scaledHeight, 0, 0, width, height);
        const pngData = exportCanvas.toDataURL("image/png");
        const response = await fetch(pngData);
        const blob = await response.blob();
        files.push({
          name: `${name}.png`,
          blob,
        });
      }
      const zip = new JSZip();
      for (let i = 0; i < files.length; i += 1) {
        const { name, blob } = files[i];
        zip.file(name, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "icons.zip");
    },
    onChange(handler: Handler<TheTypesOfEvents[Events.Change]>) {
      return bus.on(Events.Change, handler);
    },
  };
}

export const HomeIndexPage: ViewComponent = (props) => {
  const { app } = props;

  const $page = HomeIndexPageCore(props);
  const $$canvas = $page.ui.$$canvas;

  const [state, setState] = createSignal($$canvas.state);
  const [page, setPage] = createSignal($page.state);
  const [layers, setLayers] = createSignal($$canvas.layerList);

  $$canvas.onChange((v) => setState(v));
  $page.onChange((v) => setPage(v));

  const cursorClassName = () => `cursor__${state().cursor}`;

  return (
    <div>
      <div class="py-4 bg-gray-200">
        <div class="w-[1080px] mx-auto">
          <div class="text-3xl">IcoHelper</div>
        </div>
      </div>
      <div class="w-[1080px] mx-auto mt-12">
        <div
          class="__a relative w-[122px] h-[122px] mx-auto"
          style={{ "z-index": 100 }}
          onAnimationEnd={(event) => {
            const rect = event.currentTarget;
            $$canvas.setSize({
              width: rect.clientWidth,
              height: rect.clientHeight,
            });
            $$canvas.setGrid({ x: 0, y: 0, width: $$canvas.size.width, height: $$canvas.size.height });
          }}
        >
          <DropArea store={$page.ui.$dragZone}>
            <div
              classList={{
                "__a relative w-[120px] h-[120px]": true,
                [cursorClassName()]: true,
              }}
              onAnimationEnd={(event) => {
                const $canvas = event.currentTarget;
                connect($$canvas, $canvas);
              }}
            >
              <For each={layers()}>
                {(layer) => {
                  return (
                    <canvas
                      classList={{
                        "__a absolute inset-0 w-full h-full": true,
                        "pointer-events-none": layer.disabled,
                      }}
                      style={{ "z-index": layer.zIndex }}
                      onAnimationEnd={(event) => {
                        const $canvas = event.currentTarget as HTMLCanvasElement;
                        const ctx = $canvas.getContext("2d");
                        if (!ctx) {
                          return;
                        }
                        connectLayer(layer, $$canvas, $canvas, ctx);
                      }}
                    />
                  );
                }}
              </For>
            </div>
          </DropArea>
        </div>
        <div class="mt-2 mb-2 h-[36px] text-xl text-center">{page().file ? page().file?.name : ""}</div>
        <div class="h-[1px] w-full bg-gray-200"></div>
        <div class="relative mt-8">
          <TabHeader store={$page.ui.$tabs} />
        </div>
        <Show when={page().file}>
          <div class="mt-8 bg-white">
            <For each={page().sizeGroups}>
              {(group) => {
                const { label, sizes } = group;
                return (
                  <div class="flex flex-wrap">
                    <For each={sizes}>
                      {(size) => {
                        const { name, suffix, width, height } = size;
                        const filename = `${name}.${suffix}`;
                        return (
                          <div
                            class="flex flex-col items-center p-2 cursor-default hover:bg-gray-200 "
                            style="width: calc(12% - 10px)"
                          >
                            <div class="flex justify-center items-end w-[84px] h-[84px]">
                              <div
                                class="max-w-[84px] max-h-[84px]"
                                style={{ width: `${width}px`, height: `${height}px` }}
                              >
                                <img class="block shadow-xl" src={page().file!.url} alt={filename} />
                              </div>
                            </div>
                            <div class="mt-2 w-[84px] text-center break-all">{filename}</div>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </div>
      <Show when={page().file}>
        <div class="fixed bottom-12 left-1/2 -translate-x-1/2">
          <div class="flex justify-center w-[360px] rounded-md py-4 bg-gray-400">
            <div class="text-xl text-white">{i18next.t("download")}</div>
          </div>
          <div class="mt-2 text-center text-gray-600">共计18个文件</div>
        </div>
      </Show>
    </div>
  );
};
