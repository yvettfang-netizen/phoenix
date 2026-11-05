// Node 22.13 supports asynchronous module hooks via register().
import { register } from "node:module";
register("./typescript-loader.mjs", import.meta.url);
