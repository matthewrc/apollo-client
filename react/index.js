import { invariant } from "ts-invariant";
import { DEV } from "../utilities";
invariant("boolean" === typeof DEV, DEV);
export { ApolloProvider, ApolloConsumer, getApolloContext, resetApolloContext } from './context';
export * from './hooks';
export { DocumentType, operationName, parser } from './parser';
export * from './types/types';
//# sourceMappingURL=index.js.map