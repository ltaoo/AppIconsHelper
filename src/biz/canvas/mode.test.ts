import { describe, expect, it } from "vitest";
import { CanvasModeManage, StatusKeyType } from "./mode";

type StatusKeys = StatusKeyType<{
  default: {
    select: boolean;
    pen: boolean;
  };
  path_editing: {
    select: boolean;
    pen: boolean;
  };
}>;

describe("is method", () => {
  it("is cur", () => {
    const _$mode = CanvasModeManage({
      state: "default.select",
    });
    const is = _$mode.is("default.select");

    expect(is).toBe(true);
  });
  it("is parent", () => {
    const _$mode = CanvasModeManage({
      state: "default.select",
    });
    const is = _$mode.is("default");

    expect(is).toBe(true);
  });

  it("not the cur", () => {
    const _$mode = CanvasModeManage({
      state: "default.select",
    });
    const is = _$mode.is("path_editing.select");

    expect(is).toBe(false);
  });

  it("not parent", () => {
    const _$mode = CanvasModeManage({
      state: "default.select",
    });
    const is = _$mode.is("path_editing");

    expect(is).toBe(false);
  });
});

describe("set method", () => {
  it("set", () => {
    const _$mode = CanvasModeManage({
      state: "default.select",
    });
    _$mode.set("default.pen");
    const is = _$mode.is("default.pen");

    expect(is).toBe(true);
  });
});
