/**
 * @file 网络请求
 */
import { HttpClientCore } from "@/domains/http_client/index";
import { connect } from "@/domains/http_client/connect.axios";

export const client = new HttpClientCore({
  headers: {},
});
connect(client);
