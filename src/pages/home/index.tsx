/**
 * @file 首页
 */
import { createSignal, For, Show } from "solid-js";
import { saveAs } from "file-saver";
import i18next from "i18next";
import JSZip from "jszip";
import { createICNS, createICO, clearCache } from "png2icons";
import { optimize } from "svgo";

import { ViewComponent, ViewComponentProps } from "@/store/types";
import { connect, connectLayer } from "@/biz/canvas/connect.web";
import { Canvas } from "@/biz/canvas";
import { base, Handler } from "@/domains/base";
import { DragZoneCore } from "@/domains/ui/drag-zone";
import { Result } from "@/domains/result";
import { DropArea } from "@/components/ui/drop-area";
import { blobToArrayBuffer, loadImage, readFileAsArrayBuffer, readFileAsURL } from "@/utils/browser";
import { TabHeader } from "@/components/ui/tab-header";
import { TabHeaderCore } from "@/domains/ui/tab-header";
import { GithubIcon } from "@/components/GithubIcon";
import { extraFilenameWithoutSuffix } from "@/utils";

function HomeIndexPageCore(props: ViewComponentProps) {
  const { app, storage } = props;

  let _file: null | { name: string; name2: string; buffer: ArrayBuffer; url: string } = null;
  type IconSizePayload = {
    name: string;
    suffix: string;
    width: number;
    height: number;
    scale?: number;
    files?: IconSizePayload[];
  };
  const GENERAL_ICONS_SIZE_LIST: IconSizePayload[] = [
    { name: "32x32", suffix: "png", width: 32, height: 32 },
    { name: "128x128", suffix: "png", width: 128, height: 128 },
    { name: "128x128@2x", suffix: "png", width: 128, height: 128, scale: 2 },
    { name: "favicon", suffix: "ico", width: 512, height: 512 },
    { name: "icon", suffix: "ico", width: 512, height: 512 },
    { name: "icon", suffix: "icns", width: 512, height: 512 },
  ];
  const TAURI_ICONS_SIZE_LIST: IconSizePayload[] = [
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
  const FLUTTER_ICONS_SIZE_LIST: IconSizePayload[] = [
    { name: "app_icon", suffix: "ico", width: 512, height: 512 },
    { name: "flutter_logo", suffix: "png", width: 64, height: 64 },
    {
      name: "2.0x",
      suffix: "folder",
      width: 64,
      height: 64,
      files: [{ name: "flutter_logo", suffix: "png", width: 128, height: 128 }],
    },
    {
      name: "3.0x",
      suffix: "folder",
      width: 64,
      height: 64,
      files: [{ name: "flutter_logo", suffix: "png", width: 192, height: 192 }],
    },
  ];
  // https://www.electronforge.io/guides/create-and-add-icons
  const ELECTRON_ICONS_SIZE_LIST: IconSizePayload[] = [
    { name: "icon", suffix: "png", width: 512, height: 512 },
    { name: "icon@2x", suffix: "png", width: 512, height: 512, scale: 2 },
    { name: "icon@3x", suffix: "png", width: 512, height: 512, scale: 3 },
    { name: "icon", suffix: "ico", width: 512, height: 512 },
    { name: "icon", suffix: "icns", width: 512, height: 512 },
  ];
  const sizeGroups: Record<string, IconSizePayload[]> = {
    general: GENERAL_ICONS_SIZE_LIST,
    tauri: TAURI_ICONS_SIZE_LIST,
    flutter: FLUTTER_ICONS_SIZE_LIST,
    electron: ELECTRON_ICONS_SIZE_LIST,
  };
  async function loadSVGString(content: string) {
    const result = optimize(content, {
      multipass: false,
      plugins: ["removeDoctype", "removeComments", "removeDimensions"],
    });
    const blob = new Blob([result.data], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const r2 = await loadImage(url);
    if (r2.error) {
      return Result.Err(r2.error.message);
    }
    const $graph_layer = $$canvas.layer;
    const $image = r2.data;
    const scale = Math.min($$canvas.size.width / $image.width, $$canvas.size.height / $image.height);
    const x = ($$canvas.size.width - $image.width * scale) / 2;
    const y = ($$canvas.size.height - $image.height * scale) / 2;
    $graph_layer.clear();
    $graph_layer.drawImage(r2.data, { x, y }, { width: $image.width * scale, height: $image.height * scale });
    const r3 = await $graph_layer.getBlob("image/png");
    if (r3.error) {
      return Result.Err(r3.error.message);
    }
    const buffer = await blobToArrayBuffer(r3.data);
    return Result.Ok({
      url,
      buffer,
    });
  }
  async function handleFile(file: File) {
    const filename = file.name;
    const r = await readFileAsArrayBuffer(file);
    if (r.error) {
      app.tip({
        text: [r.error.message],
      });
      return;
    }
    (async () => {
      if (!filename.match(/\.(svg|png|jpg|jpeg)$/)) {
        console.log("[ERROR]validate a validate file");
        return;
      }
      const r = await readFileAsURL(file);
      if (r.error) {
        console.log(r.error.message);
        return;
      }
      storage.set("file", {
        name: file.name,
        content: r.data,
      });
    })();
    if (filename.match(/\.svg$/)) {
      const decoder = new TextDecoder("utf-8");
      const content = decoder.decode(r.data);
      const r2 = await loadSVGString(content);
      if (r2.error) {
        app.tip({
          text: [r2.error.message],
        });
        return;
      }
      _file = {
        name: filename,
        name2: extraFilenameWithoutSuffix(file.name),
        buffer: r2.data.buffer,
        url: r2.data.url,
      };
      bus.emit(Events.Change, { ...state });
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
      _file = {
        name: filename,
        name2: extraFilenameWithoutSuffix(file.name),
        buffer: r.data,
        url,
      };
      bus.emit(Events.Change, { ...state });
      const $graph_layer = $$canvas.layer;
      const $image = r2.data;
      const scale = Math.min($$canvas.size.width / $image.width, $$canvas.size.height / $image.height);
      const x = ($$canvas.size.width - $image.width * scale) / 2;
      const y = ($$canvas.size.height - $image.height * scale) / 2;
      $graph_layer.clear();
      $graph_layer.drawImage(r2.data, { x, y }, { width: $image.width * scale, height: $image.height * scale });
      return;
    }
    app.tip({
      text: [i18next.t("not_supported_format"), i18next.t("the_format_now_supported")],
    });
  }
  const IMAGE_SCALE = 10;
  async function generatePNG(size: IconSizePayload, canvas: HTMLCanvasElement): Promise<Result<Blob>> {
    const { name, suffix, width, height, scale = 1 } = size;
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
    const data = exportCanvas.toDataURL("image/png");
    try {
      const response = await fetch(data);
      const blob = await response.blob();
      return Result.Ok(blob);
    } catch (err) {
      const e = err as Error;
      return Result.Err(e.message);
    }
  }
  function isValidPNG(buffer: ArrayBuffer) {
    const uint8Array = new Uint8Array(buffer);
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
      return false;
    }
    return true;
  }
  function generateICO(file: NonNullable<typeof _file>): Result<Blob> {
    const valid = isValidPNG(file.buffer);
    if (!valid) {
      return Result.Err(i18next.t("not_a_valid_png_file"));
    }
    // @ts-ignore
    const r = createICO(file.buffer);
    clearCache();
    if (r === null) {
      return Result.Err(i18next.t("create_ico_failed"));
    }
    return Result.Ok(new Blob([r], { type: "application/octet-stream" }));
  }
  function generateICNS(file: NonNullable<typeof _file>): Result<Blob> {
    const valid = isValidPNG(file.buffer);
    if (!valid) {
      return Result.Err(i18next.t("not_a_valid_png_file"));
    }
    // @ts-ignore
    const r = createICNS(file.buffer);
    clearCache();
    if (r === null) {
      return Result.Err(i18next.t("create_ico_failed"));
    }
    return Result.Ok(new Blob([r], { type: "application/octet-stream" }));
  }
  function countFiles(sizes: IconSizePayload[]) {
    let count = 0;
    for (let i = 0; i < sizes.length; i += 1) {
      (() => {
        const size = sizes[i];
        if (size.suffix === "folder" && size.files) {
          count += countFiles(size.files);
          return;
        }
        count += 1;
      })();
    }
    return count;
  }
  const $dragZone = new DragZoneCore();
  $dragZone.onChange(async (files) => {
    if (storage.values.newuser) {
      storage.setDirectly("newuser", 0);
      bus.emit(Events.Change, { ...state });
    }
    const file = files[0];
    handleFile(file);
  });
  const $$canvas = Canvas({
    grid: {
      width: 120,
      height: 120,
      unit: 16,
    },
  });
  const $tabs = new TabHeaderCore({
    defaultTab: storage.get("tab") || "general",
    options: [
      {
        id: "general",
        text: i18next.t("general"),
      },
      {
        id: "tauri",
        text: "Tauri",
        url: "/tauri.png",
      },
      {
        id: "flutter",
        text: "Flutter",
        url: "/flutter.png",
      },
      {
        id: "electron",
        text: "Electronjs",
        url: "/electronjs.png",
      },
    ],
    onChange(value) {
      storage.set("tab", value.id);
      bus.emit(Events.Change, { ...state });
    },
  });
  const state = {
    get files() {
      const index = $tabs.state.curId;
      if (index === null) {
        return sizeGroups["general"];
      }
      return sizeGroups[index];
    },
    get file() {
      return _file;
    },
    get downloadTip() {
      if (_file === null) {
        return "";
      }
      const count = countFiles(this.files);
      return i18next.t("download_zip_with_files_count", { name: `${_file.name2}.zip`, count });
    },
    get newuser() {
      return storage.values.newuser;
    },
  };

  enum Events {
    Change,
  }
  type TheTypesOfEvents = {
    [Events.Change]: typeof state;
  };
  const bus = base<TheTypesOfEvents>();

  $$canvas.onMounted(async () => {
    const file = (() => {
      const existing = storage.get("file");
      if (existing) {
        if (existing.name.match(/\.svg$/)) {
          const data = existing.content.split(",")[1];
          const buffer = atob(data);
          const content = new TextDecoder("utf-8").decode(
            // @ts-ignore
            new Uint8Array([...buffer].map((char) => char.charCodeAt(0)))
          );
          return {
            name: existing.name,
            content,
          };
        }
        return {
          name: existing.name,
          content: existing.content,
        };
      }
      return {
        name: "github.svg",
        content: `<svg width="98" height="96" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" fill="#24292f"/></svg>`,
      };
    })();
    if (file.name.match(/\.svg$/)) {
      const r2 = await loadSVGString(file.content);
      if (r2.error) {
        app.tip({
          text: [r2.error.message],
        });
        return;
      }
      _file = {
        name: file.name,
        name2: extraFilenameWithoutSuffix(file.name),
        buffer: r2.data.buffer,
        url: r2.data.url,
      };
      bus.emit(Events.Change, { ...state });
      return;
    }
    if (file.name.match(/\.(png|jpg|jpeg)$/)) {
      const r2 = await loadImage(file.content);
      if (r2.error) {
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
      const r3 = await $graph_layer.getBlob("image/png");
      if (r3.error) {
        return Result.Err(r3.error.message);
      }
      const buffer = await blobToArrayBuffer(r3.data);
      _file = {
        name: file.name,
        name2: extraFilenameWithoutSuffix(file.name),
        buffer,
        url: file.content,
      };
      bus.emit(Events.Change, { ...state });
      return;
    }
  });

  return {
    state,
    ui: {
      $$canvas,
      $dragZone,
      $tabs,
    },
    loadSVGString,
    async downloadFiles(sizes: IconSizePayload[], file: NonNullable<typeof _file>) {
      if (_file === null) {
        app.tip({
          text: [i18next.t("please_upload_file")],
        });
        return;
      }
      const $graph_layer = $$canvas.layer;
      const canvas = $graph_layer.getCanvas() as HTMLCanvasElement;
      async function generateZIPContent(sizes: IconSizePayload[], parent: JSZip) {
        for (const size of sizes) {
          const filename = size.suffix === "folder" ? size.name : `${size.name}.${size.suffix}`;
          if (size.suffix === "png") {
            const r = await generatePNG(size, canvas);
            if (r.error) {
              app.tip({
                text: [r.error.message],
              });
              return false;
            }
            parent.file(filename, r.data);
          }
          if (size.suffix === "ico" && _file) {
            const r = await generateICO(_file);
            if (r.error) {
              app.tip({
                text: [r.error.message],
              });
              return false;
            }
            parent.file(filename, r.data);
          }
          if (size.suffix === "icns" && _file) {
            const r = await generateICNS(_file);
            if (r.error) {
              app.tip({
                text: [r.error.message],
              });
              return false;
            }
            parent.file(filename, r.data);
          }
          if (size.suffix === "folder" && size.files) {
            const folder = parent.folder(size.name);
            if (folder === null) {
              app.tip({
                text: [i18next.t("create_zip_failed")],
              });
              return false;
            }
            const success = await generateZIPContent(size.files, folder);
            if (success === false) {
              return false;
            }
          }
        }
        return true;
      }
      const zip = new JSZip();
      const success = await generateZIPContent(sizes, zip);
      if (success === false) {
        return;
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${_file.name2}.zip`);
    },
    async ready() {},
    onChange(handler: Handler<TheTypesOfEvents[Events.Change]>) {
      return bus.on(Events.Change, handler);
    },
  };
}

export const HomeIndexPage: ViewComponent = (props) => {
  const $page = HomeIndexPageCore(props);
  const $$canvas = $page.ui.$$canvas;

  const [state, setState] = createSignal($$canvas.state);
  const [page, setPage] = createSignal($page.state);
  const [layers, setLayers] = createSignal($$canvas.layerList);

  $$canvas.onChange((v) => setState(v));
  $page.onChange((v) => setPage(v));

  const cursorClassName = () => `cursor__${state().cursor}`;

  return (
    <div class="bg-[#f8f9fa] min-h-screen">
      <div class="py-4 shadow-md bg-white">
        <div class="flex items-center justify-between w-[1080px] mx-auto">
          <div class="flex items-center">
            <img class="w-[54px] h-[54px]" src="/128x128.png" />
            <div class="ml-4 text-gray-800">
              <div class="text-gray-600 text-3xl">AppIconsHelper</div>
              <div class="text-gray-400 text-lg">{i18next.t("slogan")}</div>
            </div>
          </div>
          <div>
            <a href="https://github.com/ltaoo/wx_channels_download" target="_blank">
              <GithubIcon class="w-[36px] h-[36px] text-gray-600 hover:text-gray-800 cursor-pointer" />
            </a>
          </div>
        </div>
      </div>
      <div class="w-[1080px] mx-auto mt-12">
        <div
          class="__a relative w-[120px] h-[120px] mx-auto"
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
          <Show when={page().newuser}>
            <div
              class="absolute w-[200px] h-[200px] right-[-200px] bottom-[-120px]"
              style={{ "background-image": `url("/arrow-left.png")` }}
            >
              <div class="absolute top-[24px] right-[-32px] text-2xl text-gray-800">{i18next.t("drop_file_here")}</div>
            </div>
          </Show>
        </div>
        <div class="mt-2 mb-2 h-[36px] text-xl text-center">{page().file ? page().file?.name : ""}</div>
        <div class="h-[1px] w-full px-2 bg-gray-200"></div>
        <div class="relative mt-8">
          <TabHeader store={$page.ui.$tabs} />
        </div>
        <Show when={page().file}>
          <div class="mt-8">
            <div class="flex flex-wrap">
              <For each={page().files}>
                {(size) => {
                  const { name, suffix, width, height } = size;
                  const filename = suffix === "folder" ? name : `${name}.${suffix}`;
                  return (
                    <div
                      class="flex flex-col items-center p-2 rounded-sm cursor-default hover:bg-gray-200"
                      style="width: calc(12% - 10px)"
                    >
                      <div class="flex justify-center items-end w-[84px] h-[84px]">
                        <div
                          class="flex justify-center items-end max-w-[84px] max-h-[84px]"
                          style={{ width: `${width}px`, height: `${height}px` }}
                        >
                          <img
                            class="block"
                            classList={{
                              "shadow-lg": suffix !== "folder",
                            }}
                            src={suffix === "folder" ? "/folder.png" : page().file!.url}
                            alt={filename}
                          />
                        </div>
                      </div>
                      <div class="mt-2 w-[84px] text-center break-all">{filename}</div>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>
        </Show>
      </div>
      <Show when={page().file}>
        <div class="fixed bottom-12 left-1/2 -translate-x-1/2">
          <div
            class="flex justify-center w-[360px] rounded-md py-4 bg-gray-800 cursor-pointer hover:bg-gray-900"
            onClick={() => {
              $page.downloadFiles(page().files, page().file!);
            }}
          >
            <div class="text-xl text-gray-100">{i18next.t("download")}</div>
          </div>
          <div class="mt-2 text-center text-gray-800">{page().downloadTip}</div>
        </div>
      </Show>
    </div>
  );
};
