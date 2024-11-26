export type CursorType =
  | "select-default"
  | "pen-edit"
  | "pen-close-path"
  | "pen-add-point"
  | "left-top-edge"
  | "right-top-edge"
  | "left-bottom-edge"
  | "right-bottom-edge"
  | "top-side"
  | "left-side"
  | "right-side"
  | "bottom-side"
  | "left-top-rotate"
  | "right-top-rotate"
  | "left-bottom-rotate"
  | "right-bottom-rotate";

export const AUTO_CONTROLLER_POINT_LENGTH_RATIO = 0.42;

/** 画布内容类型 */
export enum CanvasThingTypes {
  /** 文字内容 */
  Text,
  /** 图片内容 */
  Image,
  /** 编组 */
  Group,
}

/** 卡片面 */
export enum Side {
  //   Left,
  //   Right,
  //   Top,
  //   Bottom,
  Front,
  Back,
}

/**
 * 文字操作类型
 */
export enum FontToolAction {
  enlarge,
  reduce,
  underline,
  bold,
  italics,
  strikeout,
  left,
  center,
  right,
  color,
  delete,
}

export const ALL_SLIDES = [Side.Front];

export enum LineDirectionTypes {
  /** 水平线 */
  Horizontal,
  /** 垂直线 */
  Vertical,
}
/** 矩形线类型 */
export enum RectLineTypes {
  /** 上边 */
  Top,
  /** 左边 */
  Left,
  /** 右边 */
  Right,
  /** 下边 */
  Bottom,
  /** 水平中线 */
  HorizontalCenter,
  /** 垂直中线 */
  VerticalCenter,
}

/** 移动方向 */
export enum Directions {
  /** 向上 */
  Top,
  /** 向左 */
  Left,
  /** 向下 */
  Bottom,
  /** 向右 */
  Right,
  /** 左上 */
  LeftTop,
  /** 左下 */
  LeftBottom,
  /** 右上 */
  RightTop,
  /** 右下 */
  RightBottom,
}
