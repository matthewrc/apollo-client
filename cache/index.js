import { invariant } from "ts-invariant";
import { DEV } from "../utilities";
invariant("boolean" === typeof DEV, DEV);
export { ApolloCache } from './core/cache';
export { Cache } from './core/types/Cache';
export { MissingFieldError } from './core/types/common';
export { isReference, makeReference, } from '../utilities';
export { EntityStore } from './inmemory/entityStore';
export { fieldNameFromStoreName } from './inmemory/helpers';
export { InMemoryCache, } from './inmemory/inMemoryCache';
export { makeVar, cacheSlot, } from './inmemory/reactiveVars';
export { defaultDataIdFromObject, Policies, } from './inmemory/policies';
export { canonicalStringify, } from './inmemory/object-canon';
export * from './inmemory/types';
//# sourceMappingURL=index.js.map