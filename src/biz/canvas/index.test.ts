import { describe, it, expect } from "vitest";

import { Canvas } from "./index";

/**
 * 多个圆环
 * <svg t="1725725314088" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="3044" width="200" height="200"><path d="M288 373.333333c-82.432 0-149.333333 66.922667-149.333333 149.333334a149.333333 149.333333 0 0 0 149.333333 149.333333c82.496 0 149.333333-66.816 149.333333-149.333333 0-82.410667-66.88-149.333333-149.333333-149.333334z m0 64c47.104 0 85.333333 38.250667 85.333333 85.333334 0 47.146667-38.186667 85.333333-85.333333 85.333333a85.333333 85.333333 0 1 1 0-170.666667zM757.333333 672a128.021333 128.021333 0 1 0 128 128c0-70.656-57.344-128-128-128z m0 64a64.021333 64.021333 0 1 1-64 64c0-35.328 28.672-64 64-64zM757.333333 117.333333a128.021333 128.021333 0 1 0 128 128c0-70.656-57.344-128-128-128z m0 64a64.021333 64.021333 0 1 1-64 64c0-35.328 28.672-64 64-64z" fill="#000000" p-id="3045"></path><path d="M356.565333 580.864a32 32 0 0 1 43.904-10.965333l266.666667 160a32 32 0 0 1-32.938667 54.869333l-266.666666-160a32 32 0 0 1-10.965334-43.904zM643.050667 264.789333a32 32 0 0 1 36.565333 52.522667l-256 178.282667a32 32 0 0 1-36.565333-52.522667l256-178.282667z" fill="#000000" p-id="3046"></path></svg>
 */

/**
 * 连续两个逆时针，再顺时针，就处理不了了
 * <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
	<path fill="currentColor" d="M17 8q.2 0 .35-.15t.15-.35v-3q0-.2-.15-.35T17 4t-.35.15t-.15.35v3q0 .2.15.35T17 8m0 2q.2 0 .35-.15t.15-.35t-.15-.35T17 9t-.35.15t-.15.35t.15.35t.35.15m-1.5 7q.625 0 1.063-.437T17 15.5t-.437-1.062T15.5 14t-1.062.438T14 15.5t.438 1.063T15.5 17m-9 0q.625 0 1.063-.437T8 15.5t-.437-1.062T6.5 14t-1.062.438T5 15.5t.438 1.063T6.5 17M17 12q-2.075 0-3.537-1.463T12 7q0-2.05 1.45-3.525T17 2q2.075 0 3.538 1.462T22 7t-1.463 3.538T17 12M3.5 22q-.625 0-1.062-.437T2 20.5v-7.15q0-.175.025-.35t.075-.325L4.1 7q.15-.45.538-.725T5.5 6H8V5q0-.425.287-.712T9 4h.525q.425 0 .65.35t.1.75q-.125.5-.2.988T10 7.075q0 .375-.25.65T9.125 8H5.85L4.8 11h5.975q.225 0 .438.1t.362.3q1 1.225 2.413 1.913T17 14q.475 0 .925-.062t.9-.188q.425-.125.8.138t.375.687V20.5q0 .625-.437 1.063T18.5 22t-1.062-.437T17 20.5V20H5v.5q0 .625-.437 1.063T3.5 22" />
</svg>
 */

describe("SVG path convert to bezier path", () => {
  it("simple curve1", () => {
    const content = "M120.41 95.9L102.59 60.1C97.4 62.68 92.04 65.87 86.68 69.63C56.62 90.7 27.67 129.47 27.67 171.84Z";
    const bezier = Canvas({ grid: { width: 0, height: 0, unit: 0 } });
    bezier.buildBezierPathsFromPathString(content);
    const paths = bezier.paths;
    // expect(paths.length).toBe(1);
    // const path = paths[0];
    // if (!path) {
    //   return;
    // }
    // expect(path.path_points.length).toBe(4);
    // // 起点
    // expect(path.path_points[0].point.pos).toStrictEqual({
    //   x: 120.41,
    //   y: 95.9,
    // });
    // // 第一条是直线
    // expect(path.path_points[1].point.pos).toStrictEqual({
    //   x: 102.59,
    //   y: 60.1,
    // });
    // expect(path.path_points[0].to).toBe(null);
    // expect(path.path_points[1].from).toBe(null);
    // // 第二条是曲线
    // expect(path.path_points[2].point.pos).toStrictEqual({
    //   x: 86.68,
    //   y: 69.63,
    // });
    // expect(path.path_points[1].to).toBeTruthy();
    // expect(path.path_points[2].from).toBeTruthy();
    // if (path.path_points[1].to) {
    //   expect(path.path_points[1].to.pos).toStrictEqual({
    //     x: 97.4,
    //     y: 62.68,
    //   });
    // }
    // if (path.path_points[2].from) {
    //   expect(path.path_points[2].from.pos).toStrictEqual({
    //     x: 92.04,
    //     y: 65.87,
    //   });
    // }
    // // 第三条是曲线
    // expect(path.path_points[3].point.pos).toStrictEqual({
    //   x: 27.67,
    //   y: 171.84,
    // });
    // expect(path.path_points[2].to).toBeTruthy();
    // expect(path.path_points[3].from).toBeTruthy();
    // if (path.path_points[2].to) {
    //   expect(path.path_points[2].to.pos).toStrictEqual({
    //     x: 56.62,
    //     y: 90.7,
    //   });
    // }
    // if (path.path_points[3].from) {
    //   expect(path.path_points[3].from.pos).toStrictEqual({
    //     x: 27.67,
    //     y: 129.47,
    //   });
    // }
  });
});
