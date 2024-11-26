import { PageKeysType, build } from "@/domains/route_view/utils";

/**
 * @file 路由配置
 */
const configure = {
  root: {
    title: "ROOT",
    pathname: "/",
    children: {
      home_layout: {
        title: "首页布局",
        pathname: "/home",
        children: {
          index: {
            title: "首页",
            pathname: "/home/index",
            options: {
              require: ["login"],
            },
          },
        },
      },
      login: {
        title: "登录",
        pathname: "/login",
      },
      register: {
        title: "注册",
        pathname: "/register",
      },
      notfound: {
        title: "404",
        pathname: "/notfound",
      },
    },
  },
};
export type PageKeys = PageKeysType<typeof configure>;
const result = build<PageKeys>(configure);
export const routes = result.routes;
export const routesWithPathname = result.routesWithPathname;

// @ts-ignore
globalThis.__routes_with_pathname__ = routesWithPathname;
// @ts-ignore
globalThis.__routes__ = routes;
