import { maybe } from "./maybe";
export default (maybe(function () { return globalThis; }) ||
    maybe(function () { return window; }) ||
    maybe(function () { return self; }) ||
    maybe(function () { return global; }) ||
    maybe(function () { return Function("return this")(); }));
//# sourceMappingURL=global.js.map