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
  toFixPoint,
} from "@/biz/bezier_point/utils";
import { LinePath } from "@/biz/path";
import { LineCapType, LineJoinType, PathCompositeOperation } from "@/biz/line";
import { Point, PointType } from "@/biz/point";
import { Line } from "@/biz/line";
export { math } from "@/utils/math/index";

import { BoxSize, SideSize, CanvasThingShape, Position, Size, RectShape, LineShape } from "./types";
import { CanvasThingTypes, Side, ALL_SLIDES, LineDirectionTypes, RectLineTypes } from "./constants";

export function getAngle({ x: x1, y: y1 }: { x: number; y: number }, { x: x2, y: y2 }: { x: number; y: number }) {
  const dot = x1 * x2 + y1 * y2;
  const det = x1 * y2 - y1 * x2;
  const angle = (Math.atan2(det, dot) / Math.PI) * 180;
  return (angle + 360) % 360;
}

/**
 * 角度转弧度？
 * @param {number} deg - 角度
 */
export function degToRadian(deg: number) {
  return (deg * Math.PI) / 180;
}

function cos(deg: number) {
  return Math.cos(degToRadian(deg));
}
function sin(deg: number) {
  return Math.sin(degToRadian(deg));
}

/**
 *
 * @param {number} width
 * @param {number} deltaW
 * @param {number} minWidth
 */
function getAbsolutelyDistanceAtX(width: number, deltaW: number, minWidth: number) {
  const expectedWidth = width + deltaW;
  if (expectedWidth > minWidth) {
    width = expectedWidth;
  } else {
    deltaW = minWidth - width;
    width = minWidth;
  }
  return { width, deltaW };
}

function setHeightAndDeltaH(height: number, deltaH: number, minHeight: number) {
  const expectedHeight = height + deltaH;
  if (expectedHeight > minHeight) {
    height = expectedHeight;
  } else {
    deltaH = minHeight - height;
    height = minHeight;
  }
  return { height, deltaH };
}

/**
 * 根据鼠标位置、方向等，计算盒子大小、位置和角度
 */
export function calcNewStyleOfTransformingBox(
  /** 移动方向 */
  type: string,
  /** 矩形信息 */
  rect: {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    angle: number;
  },
  /** 水平方向上移动的距离 */
  deltaW: number,
  /** 垂直方向上移动的距离 */
  deltaH: number,
  /** 缩放比例 */
  ratio: number | boolean | undefined,
  /** 最小宽度 */
  minWidth: number = 1,
  /** 最小高度 */
  minHeight: number = 1
) {
  let { width, height, centerX, centerY, angle: rotateAngle } = rect;
  const widthFlag = width < 0 ? -1 : 1;
  const heightFlag = height < 0 ? -1 : 1;
  width = Math.abs(width);
  height = Math.abs(height);
  switch (type) {
    case "e": {
      const widthAndDeltaW = getAbsolutelyDistanceAtX(width, deltaW, minWidth);
      // 盒子实际宽度
      width = widthAndDeltaW.width;
      // 相对初始宽度的宽度，可能为负数
      deltaW = widthAndDeltaW.deltaW;
      // console.log("[]widthAndDeltaW", width, deltaW);
      if (ratio && typeof ratio === "number") {
        deltaH = deltaW / ratio;
        height = width / ratio;
        // 左上角固定
        centerX += (deltaW / 2) * cos(rotateAngle) - (deltaH / 2) * sin(rotateAngle);
        centerY += (deltaW / 2) * sin(rotateAngle) + (deltaH / 2) * cos(rotateAngle);
      } else {
        // 左边固定
        // console.log("[]cos(rotateAngle)", cos(rotateAngle));
        // 如果往右边移动了 10，那么中心点就往右边移动了 10/2
        centerX += (deltaW / 2) * cos(rotateAngle);
        centerY += (deltaW / 2) * sin(rotateAngle);
      }
      break;
    }
    case "tr": {
      deltaH = -deltaH;
      const widthAndDeltaW = getAbsolutelyDistanceAtX(width, deltaW, minWidth);
      width = widthAndDeltaW.width;
      deltaW = widthAndDeltaW.deltaW;
      const heightAndDeltaH = setHeightAndDeltaH(height, deltaH, minHeight);
      height = heightAndDeltaH.height;
      deltaH = heightAndDeltaH.deltaH;
      if (ratio && typeof ratio === "number") {
        deltaW = deltaH * ratio;
        width = height * ratio;
      }
      centerX += (deltaW / 2) * cos(rotateAngle) + (deltaH / 2) * sin(rotateAngle);
      centerY += (deltaW / 2) * sin(rotateAngle) - (deltaH / 2) * cos(rotateAngle);
      break;
    }
    case "br": {
      const widthAndDeltaW = getAbsolutelyDistanceAtX(width, deltaW, minWidth);
      width = widthAndDeltaW.width;
      deltaW = widthAndDeltaW.deltaW;
      const heightAndDeltaH = setHeightAndDeltaH(height, deltaH, minHeight);
      height = heightAndDeltaH.height;
      deltaH = heightAndDeltaH.deltaH;
      if (ratio && typeof ratio === "number") {
        deltaW = deltaH * ratio;
        width = height * ratio;
      }
      centerX += (deltaW / 2) * cos(rotateAngle) - (deltaH / 2) * sin(rotateAngle);
      centerY += (deltaW / 2) * sin(rotateAngle) + (deltaH / 2) * cos(rotateAngle);
      break;
    }
    case "s": {
      const heightAndDeltaH = setHeightAndDeltaH(height, deltaH, minHeight);
      height = heightAndDeltaH.height;
      deltaH = heightAndDeltaH.deltaH;
      if (ratio && typeof ratio === "number") {
        deltaW = deltaH * ratio;
        width = height * ratio;
        // 左上角固定
        centerX += (deltaW / 2) * cos(rotateAngle) - (deltaH / 2) * sin(rotateAngle);
        centerY += (deltaW / 2) * sin(rotateAngle) + (deltaH / 2) * cos(rotateAngle);
      } else {
        // 上边固定
        centerX -= (deltaH / 2) * sin(rotateAngle);
        centerY += (deltaH / 2) * cos(rotateAngle);
      }
      break;
    }
    case "bl": {
      deltaW = -deltaW;
      const widthAndDeltaW = getAbsolutelyDistanceAtX(width, deltaW, minWidth);
      width = widthAndDeltaW.width;
      deltaW = widthAndDeltaW.deltaW;
      const heightAndDeltaH = setHeightAndDeltaH(height, deltaH, minHeight);
      height = heightAndDeltaH.height;
      deltaH = heightAndDeltaH.deltaH;
      if (ratio && typeof ratio === "number") {
        height = width / ratio;
        deltaH = deltaW / ratio;
      }
      centerX -= (deltaW / 2) * cos(rotateAngle) + (deltaH / 2) * sin(rotateAngle);
      centerY -= (deltaW / 2) * sin(rotateAngle) - (deltaH / 2) * cos(rotateAngle);
      break;
    }
    case "w": {
      // console.log("[UTIL]getNewStyle - l", deltaW);
      deltaW = -deltaW;
      const widthAndDeltaW = getAbsolutelyDistanceAtX(width, deltaW, minWidth);
      width = widthAndDeltaW.width;
      deltaW = widthAndDeltaW.deltaW;
      // console.log("[UTIL]getNewStyle - l", deltaW);
      if (ratio && typeof ratio === "number") {
        height = width / ratio;
        deltaH = deltaW / ratio;
        // 右上角固定
        centerX -= (deltaW / 2) * cos(rotateAngle) + (deltaH / 2) * sin(rotateAngle);
        centerY -= (deltaW / 2) * sin(rotateAngle) - (deltaH / 2) * cos(rotateAngle);
      } else {
        // 右边固定
        centerX -= (deltaW / 2) * cos(rotateAngle);
        centerY -= (deltaW / 2) * sin(rotateAngle);
      }
      // console.log("[UTIL]getNewStyle - l", centerX);
      break;
    }
    case "tl": {
      deltaW = -deltaW;
      deltaH = -deltaH;
      const widthAndDeltaW = getAbsolutelyDistanceAtX(width, deltaW, minWidth);
      width = widthAndDeltaW.width;
      deltaW = widthAndDeltaW.deltaW;
      const heightAndDeltaH = setHeightAndDeltaH(height, deltaH, minHeight);
      height = heightAndDeltaH.height;
      deltaH = heightAndDeltaH.deltaH;
      if (ratio && typeof ratio === "number") {
        width = height * ratio;
        deltaW = deltaH * ratio;
      }
      centerX -= (deltaW / 2) * cos(rotateAngle) - (deltaH / 2) * sin(rotateAngle);
      centerY -= (deltaW / 2) * sin(rotateAngle) + (deltaH / 2) * cos(rotateAngle);
      break;
    }
    case "n": {
      deltaH = -deltaH;
      const heightAndDeltaH = setHeightAndDeltaH(height, deltaH, minHeight);
      height = heightAndDeltaH.height;
      deltaH = heightAndDeltaH.deltaH;
      if (ratio && typeof ratio === "number") {
        width = height * ratio;
        deltaW = deltaH * ratio;
        // 左下角固定
        centerX += (deltaW / 2) * cos(rotateAngle) + (deltaH / 2) * sin(rotateAngle);
        centerY += (deltaW / 2) * sin(rotateAngle) - (deltaH / 2) * cos(rotateAngle);
      } else {
        centerX += (deltaH / 2) * sin(rotateAngle);
        centerY -= (deltaH / 2) * cos(rotateAngle);
      }
      break;
    }
  }

  return {
    position: {
      centerX,
      centerY,
    },
    size: {
      width: width * widthFlag,
      height: height * heightFlag,
    },
  };
}

const cursorDirectionArray = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
export type CursorTypePrefix = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
const cursorMap: Record<number, number> = {
  0: 0,
  1: 1,
  2: 2,
  3: 2,
  4: 3,
  5: 4,
  6: 4,
  7: 5,
  8: 6,
  9: 6,
  10: 7,
  11: 8,
};
const cursorStartMap: Record<CursorTypePrefix, number> = {
  n: 0,
  ne: 1,
  e: 2,
  se: 3,
  s: 4,
  sw: 5,
  w: 6,
  nw: 7,
};

/**
 * 获取移动方向（知道移动方向就知道光标要张什么样了）
 * @param {number} rotateAngle - 当前旋转的角度
 * @param {string} d - 光标??
 * @returns 光标的类型
 */
export function getCursor(rotateAngle: number, d: CursorTypePrefix) {
  const increment = cursorMap[Math.floor(rotateAngle / 30)];
  const index = cursorStartMap[d];
  const newIndex = (index + increment) % 8;
  return cursorDirectionArray[newIndex];
}

/**
 * 根据矩形的中心点、宽高和旋转角度，计算出盒子水平方向与垂直方向的距离、宽高和旋转角度
 * @deprecated
 */
export function centerToTL({
  centerX,
  centerY,
  width,
  height,
  rotateAngle,
}: {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  rotateAngle: number;
}) {
  return {
    top: centerY - height / 2,
    left: centerX - width / 2,
    width,
    height,
    rotateAngle,
  };
}

export function tLToCenter({
  top,
  left,
  width,
  height,
  rotateAngle,
}: {
  top: number;
  left: number;
  width: number;
  height: number;
  rotateAngle: number;
}) {
  return {
    position: {
      centerX: left + width / 2,
      centerY: top + height / 2,
    },
    size: {
      width,
      height,
    },
    transform: {
      rotateAngle,
    },
  };
}

/**
 *  计算相同比例下的长宽高
 */
export function computeRelativeSize(originalSize: BoxSize, targetLength: number) {
  const { length, width, height } = originalSize;

  const targetWidth = (width / length) * targetLength;
  const targetHeight = (height / length) * targetLength;

  return {
    length: targetLength,
    width: targetWidth,
    height: targetHeight,
  };
}

interface SidesSize {
  top: SideSize;
  bottom: SideSize;
  left: SideSize;
  right: SideSize;
  front: SideSize;
  back: SideSize;
}

export function computeSideSize(length: number, width: number, height: number): SidesSize {
  const topSide = {
    width: length,
    height: width,
  };
  const bottomSide = {
    // width: length + 4,
    width: length,
    height: width,
  };
  const leftSide = {
    width,
    height,
  };
  const frontSide = {
    width: length,
    height,
  };
  return {
    top: topSide,
    bottom: bottomSide,
    left: leftSide,
    right: leftSide,
    front: frontSide,
    back: frontSide,
  };
}

function topAndBottom(boxSize: BoxSize): SideSize {
  return {
    width: boxSize.length,
    height: boxSize.width,
  };
}
function leftAndRight(boxSize: BoxSize): SideSize {
  return {
    width: boxSize.width,
    height: boxSize.height,
  };
}
function frontAndBack(boxSize: BoxSize): SideSize {
  return {
    width: boxSize.length,
    height: boxSize.height,
  };
}
function bottomSide(boxSize: BoxSize): SideSize {
  const PAGE_THICKNESS = 4;
  return {
    width: boxSize.length + PAGE_THICKNESS * 2,
    height: boxSize.width,
  };
}

const SIDE_COMPUTER = {
  // [Side.Top]: topAndBottom,
  // [Side.Bottom]: bottomSide,
  // [Side.Left]: leftAndRight,
  // [Side.Right]: leftAndRight,
  [Side.Front]: frontAndBack,
  [Side.Back]: frontAndBack,
};

/**
 *  根据盒子长宽高计算指定面宽高
 */
export function computeSingleSideSize(size: BoxSize, side: Side): SideSize {
  return SIDE_COMPUTER[side](size);
}

// export function updateContent(nextContent: CanvasThingShape, contents: Array<CanvasThingShape>) {
//   const changedContentIndex = contents.findIndex((c) => c.id === nextContent.id);
//   if (changedContentIndex === -1) {
//     return contents;
//   }
//   return [
//     ...contents.slice(0, changedContentIndex),
//     nextContent,
//     ...contents.slice(changedContentIndex + 1, contents.length),
//   ];
// }

/**
 * 粘贴事件获取图片
 * @param event
 */
// function readImageFromPaste(event: ClipboardEvent) {
//   return new Promise((resolve, reject) => {
//     const { clipboardData } = event;
//     if (clipboardData === null) {
//       reject();
//       return;
//     }
//     const { items } = clipboardData;
//     const files = Array.from(items)
//       .filter((item) => {
//         return item.type.includes("image");
//       })
//       .map((item) => {
//         const blob = item.getAsFile();
//         return blob;
//       })
//       .filter(Boolean);
//     const latestImageBlob = files[0];

//     if (latestImageBlob === null) {
//       reject();
//       return;
//     }

//     const reader = new FileReader();
//     reader.readAsDataURL(latestImageBlob);
//     reader.onloadend = () => {
//       const base64data = reader.result;
//       resolve(base64data);
//       // this.addImageContent(base64data as string);
//     };
//   });
// }

/** 从画布内容上过滤出文字内容 */
// function filterTextContentFromContents(contents: Array<CanvasThingShape>) {
//   return contents.filter((content: CanvasThingShape) => content.type === CanvasThingTypes.Text);
// }
/**
 * 过滤掉重复的字体
 */
// function filterDuplicateFont(fonts: CanvasThingShape[]) {
//   const filtered = fonts
//     .map((font) => {
//       if (font.type === CanvasThingTypes.Text) {
//         return {
//           [font.data.name]: font,
//         };
//       }
//       return font;
//     })
//     .reduce((prev, next) => {
//       return {
//         ...prev,
//         ...next,
//       };
//     }, {});
//   return Object.values(filtered);
// }

/** 从文字 font-family 属性值获取字体族名称 */
// function getFontFamily(content: CanvasThingShape) {
//   if (content.style && content.style.fontFamily) {
//     return content.style.fontFamily.split(",")[0];
//   }
//   return "cursive";
// }
// export function findFontFilesFromCanvasContents(
//   canvases: Record<string, CanvasThingShape[]>
// ) {
//   const fonts = Object.keys(canvases)
//     .map((side) => {
//       const contents = canvases[side];
//       return filterTextContentFromContents(contents);
//     })
//     .reduce((prev, next) => prev.concat(next), [])
//     .filter((font) => {
//       const { type } = font;
//       if (type === CanvasThingTypes.Text && !!font.data.fontFileUrl) {
//         return true;
//       }
//       return false;
//     })
//     .map((content) => {
//       const { type, data } = content;
//       if (type === CanvasThingTypes.Text) {
//         return { url: data.fontFileUrl, name: getFontFamily(content) };
//       }
//       return content;
//     });
//   // @ts-ignore
//   return filterDuplicateFont(fonts);
// }

// export function findMaxUuidOfContents(contents: Array<CanvasThingShape>) {
//   return Math.max.apply(
//     null,
//     contents.map((content) => {
//       return content.id;
//     })
//   );
// }

// export function findMaxUuidOfCanvases(canvases: Record<string, CanvasThingShape[]>) {
//   return Math.max.apply(
//     null,
//     Object.keys(canvases).map((side) => {
//       const contents = canvases[side];

//       const max = findMaxUuidOfContents(contents);

//       return max;
//     })
//   );
// }

/**
 * 获取数组中最大值减最小值
 */
export function getLengthByMaxSubMinInArray(arr: number[]) {
  const num = arr.sort((a, b) => a - b);
  return num[num.length - 1] - num[0];
}

/**
 * 检查是否在选择框框选范围内容
 */
// export function checkInSelectionRange(selection: RectShape, contents: CanvasThingShape[]) {
//   const mergedContents: CanvasThingShape[] = [];
//   for (let i = 0; i < contents.length; i += 1) {
//     const content = contents[i];
//     const isMerge = checkRectIsMerge(content.rect.client, selection);
//     if (isMerge) {
//       mergedContents.push(content);
//     }
//   }
//   return mergedContents;
// }

export function checkPosInBox(pos: { x: number; y: number }, box: { x: number; y: number; x1: number; y1: number }) {
  return pos.x >= box.x && pos.x <= box.x1 && pos.y >= box.y && pos.y <= box.y1;
}

export function boxToRectShape(box: { x: number; y: number; x1: number; y1: number }) {
  const { x, y, x1, y1 } = box;
  return {
    x: x,
    y: y,
    x1: x1,
    y1: y1,
    center: {
      x: (x1 - x) / 2 + x,
      y: (y1 - y) / 2 + y,
    },
  } as RectShape;
}

/**
 * 检查两个矩形是否相交
 */
export function checkRectIsMerge(rect1: RectShape, rect2: RectShape) {
  const { x: x1, y: y2, width: width1, height: height1 } = rect1;
  const x2 = x1 + width1;
  const y1 = y2 + height1;
  const { x: x3, y: y4, width: width2, height: height2 } = rect2;
  const x4 = x3 + width2;
  const y3 = y4 + height2;
  // 其实就是先看两个矩形的左边，哪个在中间，然后在中间的这条边，必须位于两个矩形的右边中，靠近左边的边的左边
  // 垂直方向上同理
  return Math.max(x1, x3) <= Math.min(x2, x4) && Math.max(y2, y4) <= Math.min(y1, y3);
}
/** 从指定 rect 拿到该矩形所有线 */
export function getLinesFromRect(rect: RectShape) {
  const { x: left, x1: right, y1: bottom, y: top, center, width, height } = rect;
  const rectLines: LineShape[] = [
    {
      type: LineDirectionTypes.Horizontal,
      origin: left,
      y: top,
      length: width,
      typeAtRect: RectLineTypes.Top,
    },
    {
      type: LineDirectionTypes.Horizontal,
      origin: left,
      y: center.y,
      length: width,
      typeAtRect: RectLineTypes.HorizontalCenter,
    },
    {
      type: LineDirectionTypes.Horizontal,
      y: bottom,
      origin: left,
      length: width,
      typeAtRect: RectLineTypes.Bottom,
    },
    {
      type: LineDirectionTypes.Vertical,
      origin: top,
      x: left,
      length: height,
      typeAtRect: RectLineTypes.Left,
    },
    {
      type: LineDirectionTypes.Vertical,
      origin: top,
      x: center.x,
      length: height,
      typeAtRect: RectLineTypes.VerticalCenter,
    },
    {
      type: LineDirectionTypes.Vertical,
      origin: top,
      x: right,
      length: height,
      typeAtRect: RectLineTypes.Right,
    },
  ];
  return rectLines;
}

/**
 * 检查矩形是否靠近指定线条
 */
export function findNearbyLinesAtRect(
  rect: RectShape,
  lines: LineShape[],
  options: {
    threshold?: number;
  } = {}
): [RectShape, LineShape[]] {
  const rectLines = getLinesFromRect(rect);
  const result: LineShape[] = [];
  const nextRect = { ...rect };
  for (let i = 0; i < rectLines.length; i += 1) {
    const rectLine = rectLines[i];
    for (let j = 0; j < lines.length; j += 1) {
      const line = lines[j];
      if (checkTowLinesIsNear(rectLine, line, options)) {
        result.push(line);
        const rectLineType = rectLine.typeAtRect;
        if (rectLineType === RectLineTypes.Top && line.type === LineDirectionTypes.Horizontal) {
          nextRect.y = line.y;
        }
        if (rectLineType === RectLineTypes.HorizontalCenter && line.type === LineDirectionTypes.Horizontal) {
          nextRect.y = line.y - nextRect.height / 2;
        }
        if (rectLineType === RectLineTypes.Bottom && line.type === LineDirectionTypes.Horizontal) {
          nextRect.y = line.y - nextRect.height;
        }
        if (rectLineType === RectLineTypes.Left && line.type === LineDirectionTypes.Vertical) {
          nextRect.x = line.x;
        }
        if (rectLineType === RectLineTypes.VerticalCenter && line.type === LineDirectionTypes.Vertical) {
          nextRect.x = line.x - nextRect.width / 2;
        }
        if (rectLineType === RectLineTypes.Right && line.type === LineDirectionTypes.Vertical) {
          // console.log("[UTILS]findNearbyLinesAtRect - rect right line");
          nextRect.x = line.x - nextRect.width;
        }
      }
    }
  }
  return [nextRect, result];
}

/**
 * 检查两根线是否靠近
 */
function checkTowLinesIsNear(
  line1: LineShape,
  line2: LineShape,
  options: Partial<{
    threshold: number;
  }> = {}
) {
  const { type: type1 } = line1;
  const { type: type2 } = line2;
  const { threshold = 10 } = options;
  if (type1 !== type2) {
    return false;
  }
  if (type1 === LineDirectionTypes.Horizontal && type2 === LineDirectionTypes.Horizontal) {
    const v1 = line1.y;
    const v2 = line2.y;
    if (Math.abs(v1 - v2) < threshold) {
      return true;
    }
    return false;
  }
  if (type1 === LineDirectionTypes.Vertical && type2 === LineDirectionTypes.Vertical) {
    const v1 = line1.x;
    const v2 = line2.x;
    if (Math.abs(v1 - v2) < threshold) {
      return true;
    }
    return false;
  }
  return false;
}

/** 返回一个空 rect */
export function createEmptyRectShape(rect: Partial<RectShape> = {}) {
  return Object.assign(
    {
      x: 0,
      y: 0,
      x1: 0,
      y1: 0,
      width: 0,
      height: 0,
      angle: 0,
      center: {
        x: 0,
        y: 0,
      },
      index: 0,
    },
    rect
  ) as RectShape;
}

/**
 * uuid 工厂函数
 */
export function uuidFactory() {
  let _uuid = -1;
  return function uuid() {
    // console.log("[UTILS]uuid", _uuid);
    _uuid += 1;
    return _uuid;
  };
  // function setUuid(nextUuid: number) {
  //   _uuid = nextUuid;
  //   return _uuid;
  // }
}

/**
 * 粘贴事件获取图片
 * @param event
 */
// export function readImageFromPaste(event: ClipboardEvent) {
//   return new Promise((resolve, reject) => {
//     const { clipboardData } = event;
//     if (clipboardData === null) {
//       reject();
//       return;
//     }
//     const { items } = clipboardData;
//     const files = Array.from(items)
//       .filter((item) => {
//         return item.type.includes("image");
//       })
//       .map((item) => {
//         const blob = item.getAsFile();
//         return blob;
//       })
//       .filter(Boolean);
//     const latestImageBlob = files[0];

//     if (latestImageBlob === null) {
//       reject();
//       return;
//     }

//     const reader = new FileReader();
//     reader.readAsDataURL(latestImageBlob);
//     reader.onloadend = () => {
//       const base64data = reader.result;
//       resolve(base64data);
//       // this.addImageContent(base64data as string);
//     };
//   });
// }

/**
 * 加载一张图片
 */
// export function loadImage(url: string): Promise<HTMLImageElement> {
//   return new Promise((resolve, reject) => {
//     const img = document.createElement("img");
//     img.setAttribute("crossOrigin", "Anonymous");
//     img.src = url;
//     img.width = 0;
//     img.height = 0;
//     document.body.appendChild(img);
//     img.onload = () => {
//       document.body.removeChild(img);
//       resolve(img);
//     };
//     img.onerror = (error) => {
//       document.body.removeChild(img);
//       reject(error);
//     };
//   });
// }

export function opentypeCommandsToTokens(
  commands: {
    type: string;
    // x?: string;
    // y?: string;
    // x1?: string;
    // y1?: string;
    // x2?: string;
    // y2?: string;
    x?: number;
    y?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
  }[]
) {
  let str = "";
  const tokens = commands.map((p) => {
    const { type, x, y, x1, y1, x2, y2 } = p;
    if (type === "Q" && x && y && x1 && y1) {
      str += `Q${x1} ${y1} ${x} ${y}`;
      return [type, x1, y1, x, y];
    }
    if (type === "C" && x && y && x1 && y1 && x2 && y2) {
      str += `C${x1} ${y1} ${x2} ${y2} ${x} ${y}`;
      return [type, x1, y1, x2, y2, x, y];
    }
    if (type === "Z") {
      str += `Z`;
      return [type];
    }
    if (type === "M" && x && y) {
      str += `M${x} ${y}`;
      return [type, x, y];
    }
    if (type === "L" && x && y) {
      str += `L${x} ${y}`;
      return [type, x, y];
    }
    return [];
  });
  return tokens.map((values) => {
    return values.map(String);
  });
}

/**
 * 将 SVG 标签，转换成项目内的路径对象
 */
export function buildPath(
  path: Line,
  tokens: string[][],
  process: {
    normalizeX: (v: number) => number;
    normalizeY: (v: number) => number;
    /** 移动一个点 */
    translate: (pos: { x: number; y: number }) => { x: number; y: number };
    translateX: (v: number) => number;
    translateY: (v: number) => number;
  }
) {
  // const yExtra = xExtra;
  let composite_relative_path: LinePath | null = null;
  let cur_path: LinePath | null = null;
  let cur_path_point: BezierPoint | null = null;
  let prev_path_point: BezierPoint | null = null;
  let prev_point = { x: 0, y: 0 };
  let start_path_point: BezierPoint | null = null;
  let prev_start = { x: 0, y: 0 };
  function moveTo(p: { x: number; y: number }, extra: Partial<{ is_relative: boolean }> = {}) {
    p.x += prev_point.x;
    p.y += prev_point.y;
  }
  console.log("tokens", tokens);
  for (let i = 0; i < tokens.length; i += 1) {
    const prev = tokens[i - 1];
    const cur = tokens[i];
    const next = tokens[i + 1];
    const [command, ...args] = cur;
    const values = args.map((v) => Number(v));
    // console.log("cur command is", command);
    if (i === tokens.length - 1) {
      if (cur_path) {
        if (cur_path.checkIsClosed()) {
          cur_path.setClosed();
          const clockwise = checkIsClockwise(cur_path.path_points);
          cur_path.setClockWise(clockwise);
          // console.log("check is clockwise", clockwise);
        }
      }
    }
    if (["M", "m"].includes(command)) {
      if (cur_path) {
        if (cur_path.path_points.length === 1) {
          // 如果路径只有一个 moveTo，就抛弃这个 path
          //
        }
        if (cur_path.checkIsClosed()) {
          cur_path.setClosed();
          const clockwise = checkIsClockwise(cur_path.path_points);
          cur_path.setClockWise(clockwise);
          // console.log("check is clockwise 2", clockwise);
        }
      }
      let v0 = values[0];
      let v1 = values[1];
      let p = {
        x: process.normalizeX(v0),
        y: process.normalizeY(v1),
      };
      if (command === "m") {
        // moveTo(p);
        p.x += prev_start.x;
        p.y += prev_start.y;
        if (i === 0) {
          p = process.translate(p);
        }
      } else {
        p = process.translate(p);
      }
      Object.assign(prev_start, p);
      // console.log("[BIZ]before new start point", v0, v1, prev_point);
      prev_point = p;
      const point = BezierPoint({
        point: Point({
          x: p.x,
          y: p.y,
          type: PointType.Anchor,
        }),
        from: null,
        to: null,
        start: true,
        virtual: false,
      });
      start_path_point = point;
      cur_path_point = point;
      const new_path = LinePath({
        points: [point],
      });
      path.append(new_path);
      if (cur_path) {
        // const cur_size = new_path.size;
        // const prev_size = cur_path.size;
        // console.log("cur size compare with prev_size", cur_size, prev_size);
        // if (
        //   cur_size.x > prev_size.x &&
        //   cur_size.y > prev_size.y &&
        //   cur_size.x2 < prev_size.x2 &&
        //   cur_size.y2 < prev_size.y2
        // ) {
        //   // 当前这个，在前面那个的里面
        //   if (cur_path.composite === "source-over") {
        //     new_path.setComposite("destination-out");
        //   }
        //   if (cur_path.composite === "destination-out") {
        //     composite_relative_path = new_path;
        //     new_path.setComposite("source-over");
        //   }
        // }
        // // 如果前面那个，在当前这个的里面
        // if (composite_relative_path) {
        //   const cur_size = new_path.size;
        //   const prev_size = composite_relative_path.size;
        //   if (
        //     cur_size.x > prev_size.x &&
        //     cur_size.y > prev_size.y &&
        //     cur_size.x2 < prev_size.x2 &&
        //     cur_size.y2 < prev_size.y2
        //   ) {
        //     if (composite_relative_path.composite === "source-over") {
        //       new_path.setComposite("destination-out");
        //     }
        //     if (composite_relative_path.composite === "destination-out") {
        //     }
        //   }
        // }
      }
      if (i === 0) {
        composite_relative_path = new_path;
      }
      cur_path = new_path;
    }
    if (["Z", "z"].includes(command)) {
      // console.log("[BIZ]command is Z", cur_path);
      if (start_path_point) {
        start_path_point.setEnd(true);
        start_path_point.setClosed();
      }
      if (cur_path) {
        cur_path.setClosed();
        const clockwise = checkIsClockwise(cur_path.path_points);
        cur_path.setClockWise(clockwise);
        // console.log("check is clockwise 3", clockwise);
      }
      // cur_path.setClosed();
    }
    if (next && cur_path) {
      const [next_command, ...next_args] = next;
      const next_values = next_args.map((v) => Number(v));
      // console.log("next command is", next_command);
      if (["A", "a"].includes(next_command)) {
        const [rx, ry, rotate, t1, t2, x, y] = next_values;
        // @todo 这里是默认必定是圆形，但也可能是椭圆，后面支持吧。
        let p1 = { ...prev_point };
        let p2 = { x: process.normalizeX(x), y: process.normalizeY(y) };
        let radius = process.normalizeX(rx);
        if (next_command === "a") {
          moveTo(p2);
        } else {
          p2 = process.translate(p2);
        }
        prev_point = p2;
        const start = p1;
        const arc = {
          rx: radius,
          ry: radius,
          rotate,
          t1,
          t2,
          end: p2,
        };
        console.log("[BIZ]canvas / before arc_to_curve", start, arc, next_values);
        const pointsArr = arc_to_curve(start, arc).slice(0, 2); // 如果半圆有一点点偏差，出现三个元素，就不对了，只需要前两个元素即可组成半圆
        console.log("[BIZ]canvas / after arc_to_curve", pointsArr);
        let inner_cur_path_point: BezierPoint | null = null;
        for (let k = 0; k < pointsArr.length; k += 1) {
          const inner_cur = pointsArr[k];
          // console.log("inner_cur", inner_cur);
          const inner_next = pointsArr[k + 1];
          if (cur_path_point) {
            cur_path_point.setTo(Point(inner_cur[1]));
            cur_path_point.setMirror(BezierPointMirrorTypes.MirrorAngleAndLength);
            // if (cur_path_point.start) {
            // }
            // if (cur_path_point.from) {
            //   cur_path_point.setTo(BezierPoint(inner_cur[1]));
            // }
          }
          if (inner_cur_path_point && inner_cur_path_point.from) {
            inner_cur_path_point.setTo(Point(inner_cur[1]));
            inner_cur_path_point.setMirror(BezierPointMirrorTypes.MirrorAngleAndLength);
          }
          const new_cur_path_point = BezierPoint({
            point: Point(inner_cur[3]),
            from: Point(inner_cur[2]),
            to: inner_next ? Point(inner_next[1]) : null,
            mirror: inner_next ? BezierPointMirrorTypes.MirrorAngleAndLength : null,
            virtual: false,
          });
          cur_path_point = new_cur_path_point;
          inner_cur_path_point = new_cur_path_point;
          cur_path.appendPoint(new_cur_path_point);
        }

        // const is_reverse = p1.x > p2.x;
        // const distance = distanceOfPoints(p1, p2);
        // if (radius < distance / 2) {
        //   radius = distance / 2;
        // }
        // const centers = calculateCircleCenter(p1, p2, radius);
        // if (centers) {
        //   const [index1, index2] = (() => {
        //     if (t1 === 0 && t2 === 0) {
        //       return [0, 1];
        //     }
        //     if (t1 === 0 && t2 === 1) {
        //       return [1, 0];
        //     }
        //     if (t1 === 1 && t2 === 0) {
        //       return [1, 1];
        //     }
        //     if (t1 === 1 && t2 === 1) {
        //       return [0, 0];
        //     }
        //     return [0, 1];
        //   })();
        //   const center = centers[index1];
        //   const arcs = calculateCircleArcs(center, p1, p2);
        //   const arc = arcs[index2];
        //   // console.log("[BIZ]canvas/index - after calculateCircleArcs(center", center, p1, p2, arc);
        //   const circle: CircleCurved = {
        //     center,
        //     radius,
        //     arc,
        //     counterclockwise: (() => {
        //       if (t1 === 0 && t2 === 0) {
        //         // if (is_reverse) {
        //         return true;
        //         // }
        //       }
        //       // if (t1 === 0 && t2 === 1) {
        //       //   return false;
        //       // }
        //       if (t1 === 1 && t2 === 0) {
        //         if (is_reverse) {
        //           return true;
        //         }
        //       }
        //       // if (t1 === 1 && t2 === 1) {
        //       // }
        //       return false;
        //     })(),
        //     extra: { start: p1, rx, ry, rotate, t1, t2 },
        //   };
        //   // console.log("create point", next_command, next_values, p2, circle);
        //   const next_path_point = PathPoint({
        //     point: BezierPoint(p2),
        //     from: null,
        //     to: null,
        //     circle,
        //     virtual: false,
        //   });
        //   cur_path_point = next_path_point;
        //   cur_path.appendPoint(next_path_point);
        // }
      }
      if (["L", "l"].includes(next_command)) {
        let v0 = next_values[0];
        let v1 = next_values[1];
        let p = {
          x: process.normalizeX(v0),
          y: process.normalizeY(v1),
        };
        if (["l"].includes(next_command)) {
          // p = {
          //   x: this.normalizeX(v0, { ...xExtra, pureValue: true }),
          //   y: this.normalizeY(v1, { ...xExtra, pureValue: true }),
          // };
          moveTo(p);
        } else {
          p = process.translate(p);
        }
        prev_point = p;
        // console.log("create point", next_command, next, next_values, p);
        const next_path_point = BezierPoint({
          point: Point({
            x: p.x,
            y: p.y,
            type: PointType.Anchor,
          }),
          from: null,
          to: null,
          virtual: false,
        });
        cur_path_point = next_path_point;
        cur_path.appendPoint(next_path_point);
      }
      if (["V", "v", "H", "h"].includes(next_command)) {
        let distance = (() => {
          const v = next_values[0];
          if (["H", "h"].includes(next_command)) {
            return process.normalizeX(v);
          }
          if (["V", "v"].includes(next_command)) {
            return process.normalizeY(v);
          }
          return v;
        })();
        let p = {
          x: 0,
          y: 0,
        };
        if (next_command === "H") {
          p.x = process.translateX(distance);
          p.y = prev_point.y;
          // p = this.translate(p);
        }
        if (next_command === "V") {
          p.x = prev_point.x;
          p.y = process.translateY(distance);
          // p = this.translate(p);
        }
        if (next_command === "h") {
          distance += prev_point.x;
          // p.x = this.translateX(distance);
          p.x = distance;
          p.y = prev_point.y;
        }
        if (next_command === "v") {
          distance += prev_point.y;
          p.x = prev_point.x;
          // p.y = this.translateX(distance);
          p.y = distance;
        }
        prev_point = p;
        // console.log("create point", next_command, next, next_values, p);
        const next_path_point = BezierPoint({
          point: Point({
            x: p.x,
            y: p.y,
            type: PointType.Anchor,
          }),
          from: null,
          to: null,
          virtual: false,
        });
        cur_path_point = next_path_point;
        cur_path.appendPoint(next_path_point);
      }
      if (["C", "c"].includes(next_command)) {
        let v0 = next_values[0];
        let v1 = next_values[1];
        let v2 = next_values[2];
        let v3 = next_values[3];
        let v4 = next_values[4];
        let v5 = next_values[5];
        let a1 = {
          x: process.normalizeX(v0),
          y: process.normalizeY(v1),
        };
        let a2 = {
          x: process.normalizeX(v4),
          y: process.normalizeY(v5),
        };
        let a3 = {
          x: process.normalizeX(v2),
          y: process.normalizeY(v3),
        };
        if (["c"].includes(next_command)) {
          moveTo(a1);
          moveTo(a2);
          moveTo(a3);
        } else {
          a1 = process.translate(a1);
          a2 = process.translate(a2);
          a3 = process.translate(a3);
        }
        prev_point = a2;
        if (cur_path_point) {
          // 这里 cur_path_point 其实是 prev_path_point ？？？
          cur_path_point.setTo(
            Point({
              x: a1.x,
              y: a1.y,
              type: PointType.Control,
            })
          );
          if (cur_path_point.from) {
            const collinear = isCollinear(cur_path_point.from.pos, cur_path_point.point.pos, a1);
            cur_path_point.setMirror(BezierPointMirrorTypes.NoMirror);
            if (collinear.collinear) {
              cur_path_point.setMirror(BezierPointMirrorTypes.MirrorAngle);
              if (collinear.midpoint) {
                cur_path_point.setMirror(BezierPointMirrorTypes.MirrorAngleAndLength);
              }
            }
          }
        }
        // console.log("create point", next_command, a2);
        const next_path_point = BezierPoint({
          point: Point({
            x: a2.x,
            y: a2.y,
            type: PointType.Anchor,
          }),
          from: Point({
            x: a3.x,
            y: a3.y,
            type: PointType.Control,
          }),
          to: null,
          virtual: false,
        });
        cur_path_point = next_path_point;
        cur_path.appendPoint(next_path_point);
      }
      if (["S", "s"].includes(next_command)) {
        // console.log("command S or s", !!cur_path_point, !!cur_path_point?.from, next_values);
        if (cur_path_point && cur_path_point.from) {
          let v0 = next_values[0];
          let v1 = next_values[1];
          let v2 = next_values[2];
          let v3 = next_values[3];
          let a2 = {
            x: process.normalizeX(v0),
            y: process.normalizeY(v1),
          };
          let a3 = {
            x: process.normalizeX(v2),
            y: process.normalizeY(v3),
          };
          if (["s"].includes(next_command)) {
            moveTo(a2);
            moveTo(a3);
          } else {
            a2 = process.translate(a2);
            a3 = process.translate(a3);
          }
          prev_point = a3;
          const a1 = findSymmetricPoint(cur_path_point.point.pos, cur_path_point.from.pos);
          cur_path_point.setTo(
            Point({
              x: a1.x,
              y: a1.y,
              type: PointType.Control,
            })
          );
          cur_path_point.setMirror(BezierPointMirrorTypes.MirrorAngleAndLength);
          // console.log("before create next_path_point", a2, a3);
          const next_path_point = BezierPoint({
            point: Point({ x: a3.x, y: a3.y, type: PointType.Anchor }),
            from: Point({ x: a2.x, y: a2.y, type: PointType.Control }),
            to: null,
            virtual: false,
          });
          cur_path_point = next_path_point;
          cur_path.appendPoint(next_path_point);
        }
      }
      if (["Q", "q"].includes(next_command)) {
        const v0 = next_values[0];
        const v1 = next_values[1];
        const v2 = next_values[2];
        const v3 = next_values[3];
        let a1 = {
          x: process.normalizeX(v0),
          y: process.normalizeY(v1),
        };
        let a2 = {
          x: process.normalizeX(v2),
          y: process.normalizeY(v3),
        };
        if (["q"].includes(next_command)) {
          moveTo(a1);
          moveTo(a2);
        } else {
          a1 = process.translate(a1);
          a2 = process.translate(a2);
        }
        prev_point = a2;
        const next_path_point = BezierPoint({
          point: Point({
            x: a2.x,
            y: a2.y,
            type: PointType.Anchor,
          }),
          from: Point({
            x: a1.x,
            y: a1.y,
            type: PointType.Control,
          }),
          to: null,
          virtual: false,
        });
        cur_path_point = next_path_point;
        cur_path.appendPoint(next_path_point);
      }
      if (["T", "t"].includes(next_command)) {
        const v0 = next_values[0];
        const v1 = next_values[1];
        let a2 = {
          x: process.normalizeX(v0),
          y: process.normalizeY(v1),
        };
        if (["t"].includes(next_command)) {
          moveTo(a2);
        } else {
          a2 = process.translate(a2);
        }
        prev_point = a2;
        if (cur_path_point && cur_path_point.from) {
          // const a1 = getSymmetricPoints(cur_path_point.point.pos, cur_path_point.from.pos);
          const prev_x = cur_path_point.point.pos.x;
          const prev_from_x = cur_path_point.from.pos.x;
          const prev_y = cur_path_point.point.pos.y;
          const prev_from_y = cur_path_point.from.pos.y;
          const a1 = {
            x: prev_x + (prev_x - prev_from_x),
            y: prev_y + (prev_y - prev_from_y),
          };
          const next_path_point = BezierPoint({
            point: Point({
              x: a2.x,
              y: a2.y,
              type: PointType.Anchor,
            }),
            from: Point({
              x: a1.x,
              y: a1.y,
              type: PointType.Control,
            }),
            to: null,
            virtual: false,
          });
          cur_path_point = next_path_point;
          cur_path.appendPoint(next_path_point);
        }
      }
    }
  }
}
