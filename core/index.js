import { DEV } from "../utilities";
export { ApolloClient, mergeOptions, } from './ApolloClient';
export { ObservableQuery, applyNextFetchPolicy, } from './ObservableQuery';
export { NetworkStatus } from './networkStatus';
export * from './types';
export { isApolloError, ApolloError } from '../errors';
export { Cache, ApolloCache, InMemoryCache, MissingFieldError, defaultDataIdFromObject, makeVar, } from '../cache';
export * from '../cache/inmemory/types';
export * from '../link/core';
export * from '../link/http';
export { fromError, toPromise, fromPromise, throwServerError, } from '../link/utils';
export { Observable, isReference, makeReference, } from '../utilities';
import { setVerbosity } from "ts-invariant";
export { setVerbosity as setLogVerbosity };
setVerbosity(DEV ? "log" : "silent");
export { gql, resetCaches, disableFragmentWarnings, enableExperimentalFragmentVariables, disableExperimentalFragmentVariables, } from 'graphql-tag';
//# sourceMappingURL=index.js.map