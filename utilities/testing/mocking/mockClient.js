import { ApolloClient } from '../../../core';
import { InMemoryCache } from '../../../cache';
import { mockSingleLink } from './mockLink';
export function createMockClient(data, query, variables) {
    if (variables === void 0) { variables = {}; }
    return new ApolloClient({
        link: mockSingleLink({
            request: { query: query, variables: variables },
            result: { data: data },
        }).setOnError(function (error) { throw error; }),
        cache: new InMemoryCache({ addTypename: false }),
    });
}
//# sourceMappingURL=mockClient.js.map