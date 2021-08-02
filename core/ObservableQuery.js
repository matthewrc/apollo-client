import { __assign, __extends } from "tslib";
import { invariant } from 'ts-invariant';
import { equal } from '@wry/equality';
import { NetworkStatus, isNetworkRequestInFlight } from './networkStatus';
import { compact, cloneDeep, getOperationDefinition, Observable, iterateObserversSafely, isNonEmptyArray, fixObservableSubclass, } from '../utilities';
import { ApolloError } from '../errors';
var warnedAboutUpdateQuery = false;
var ObservableQuery = (function (_super) {
    __extends(ObservableQuery, _super);
    function ObservableQuery(_a) {
        var queryManager = _a.queryManager, queryInfo = _a.queryInfo, options = _a.options;
        var _this = _super.call(this, function (observer) {
            try {
                var subObserver = observer._subscription._observer;
                if (subObserver && !subObserver.error) {
                    subObserver.error = defaultSubscriptionObserverErrorCallback;
                }
            }
            catch (_a) { }
            var first = !_this.observers.size;
            _this.observers.add(observer);
            if (_this.lastError) {
                observer.error && observer.error(_this.lastError);
            }
            else if (_this.lastResult) {
                observer.next && observer.next(_this.lastResult);
            }
            if (first) {
                _this.reobserve().catch(function () { });
            }
            return function () {
                if (_this.observers.delete(observer) && !_this.observers.size) {
                    _this.tearDownQuery();
                }
            };
        }) || this;
        _this.observers = new Set();
        _this.subscriptions = new Set();
        _this.observer = {
            next: function (result) {
                if (_this.lastError || _this.isDifferentFromLastResult(result)) {
                    _this.updateLastResult(result);
                    iterateObserversSafely(_this.observers, 'next', result);
                }
            },
            error: function (error) {
                _this.updateLastResult(__assign(__assign({}, _this.lastResult), { error: error, errors: error.graphQLErrors, networkStatus: NetworkStatus.error, loading: false }));
                iterateObserversSafely(_this.observers, 'error', _this.lastError = error);
            },
        };
        _this.isTornDown = false;
        _this.options = options;
        _this.queryId = queryManager.generateQueryId();
        var opDef = getOperationDefinition(options.query);
        _this.queryName = opDef && opDef.name && opDef.name.value;
        _this.initialFetchPolicy = options.fetchPolicy || "cache-first";
        _this.queryManager = queryManager;
        _this.queryInfo = queryInfo;
        return _this;
    }
    Object.defineProperty(ObservableQuery.prototype, "variables", {
        get: function () {
            return this.options.variables;
        },
        enumerable: false,
        configurable: true
    });
    ObservableQuery.prototype.result = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var observer = {
                next: function (result) {
                    resolve(result);
                    _this.observers.delete(observer);
                    if (!_this.observers.size) {
                        _this.queryManager.removeQuery(_this.queryId);
                    }
                    setTimeout(function () {
                        subscription.unsubscribe();
                    }, 0);
                },
                error: reject,
            };
            var subscription = _this.subscribe(observer);
        });
    };
    ObservableQuery.prototype.getCurrentResult = function (saveAsLastResult) {
        if (saveAsLastResult === void 0) { saveAsLastResult = true; }
        var _a = this, lastResult = _a.lastResult, _b = _a.options.fetchPolicy, fetchPolicy = _b === void 0 ? "cache-first" : _b;
        var networkStatus = this.queryInfo.networkStatus ||
            (lastResult && lastResult.networkStatus) ||
            NetworkStatus.ready;
        var result = __assign(__assign({}, lastResult), { loading: isNetworkRequestInFlight(networkStatus), networkStatus: networkStatus });
        if (!this.queryManager.transform(this.options.query).hasForcedResolvers) {
            var diff = this.queryInfo.getDiff();
            result.data = (diff.complete ||
                this.options.returnPartialData) ? diff.result : void 0;
            if (diff.complete) {
                if (result.networkStatus === NetworkStatus.loading &&
                    (fetchPolicy === 'cache-first' ||
                        fetchPolicy === 'cache-only')) {
                    result.networkStatus = NetworkStatus.ready;
                    result.loading = false;
                }
                delete result.partial;
            }
            else if (fetchPolicy !== "no-cache") {
                result.partial = true;
            }
            if (!diff.complete &&
                !this.options.partialRefetch &&
                !result.loading &&
                !result.data &&
                !result.error) {
                result.error = new ApolloError({ clientErrors: diff.missing });
            }
        }
        if (saveAsLastResult) {
            this.updateLastResult(result);
        }
        return result;
    };
    ObservableQuery.prototype.isDifferentFromLastResult = function (newResult) {
        return !equal(this.lastResultSnapshot, newResult);
    };
    ObservableQuery.prototype.getLastResult = function () {
        return this.lastResult;
    };
    ObservableQuery.prototype.getLastError = function () {
        return this.lastError;
    };
    ObservableQuery.prototype.resetLastResults = function () {
        delete this.lastResult;
        delete this.lastResultSnapshot;
        delete this.lastError;
        this.isTornDown = false;
    };
    ObservableQuery.prototype.resetQueryStoreErrors = function () {
        this.queryManager.resetErrors(this.queryId);
    };
    ObservableQuery.prototype.refetch = function (variables) {
        var reobserveOptions = {
            pollInterval: 0,
        };
        var fetchPolicy = this.options.fetchPolicy;
        if (fetchPolicy === 'no-cache') {
            reobserveOptions.fetchPolicy = 'no-cache';
        }
        else if (fetchPolicy !== 'cache-and-network') {
            reobserveOptions.fetchPolicy = 'network-only';
        }
        if (variables && !equal(this.options.variables, variables)) {
            reobserveOptions.variables = this.options.variables = __assign(__assign({}, this.options.variables), variables);
        }
        this.queryInfo.resetLastWrite();
        return this.reobserve(reobserveOptions, NetworkStatus.refetch);
    };
    ObservableQuery.prototype.fetchMore = function (fetchMoreOptions) {
        var _this = this;
        var combinedOptions = __assign(__assign({}, (fetchMoreOptions.query ? fetchMoreOptions : __assign(__assign(__assign({}, this.options), fetchMoreOptions), { variables: __assign(__assign({}, this.options.variables), fetchMoreOptions.variables) }))), { fetchPolicy: "no-cache" });
        var qid = this.queryManager.generateQueryId();
        if (combinedOptions.notifyOnNetworkStatusChange) {
            this.queryInfo.networkStatus = NetworkStatus.fetchMore;
            this.observe();
        }
        return this.queryManager.fetchQuery(qid, combinedOptions, NetworkStatus.fetchMore).then(function (fetchMoreResult) {
            var data = fetchMoreResult.data;
            var updateQuery = fetchMoreOptions.updateQuery;
            if (updateQuery) {
                if (__DEV__ &&
                    !warnedAboutUpdateQuery) {
                    invariant.warn("The updateQuery callback for fetchMore is deprecated, and will be removed\nin the next major version of Apollo Client.\n\nPlease convert updateQuery functions to field policies with appropriate\nread and merge functions, or use/adapt a helper function (such as\nconcatPagination, offsetLimitPagination, or relayStylePagination) from\n@apollo/client/utilities.\n\nThe field policy system handles pagination more effectively than a\nhand-written updateQuery function, and you only need to define the policy\nonce, rather than every time you call fetchMore.");
                    warnedAboutUpdateQuery = true;
                }
                _this.updateQuery(function (previous) { return updateQuery(previous, {
                    fetchMoreResult: data,
                    variables: combinedOptions.variables,
                }); });
            }
            else {
                _this.queryManager.cache.writeQuery({
                    query: combinedOptions.query,
                    variables: combinedOptions.variables,
                    data: data,
                });
            }
            return fetchMoreResult;
        }).finally(function () {
            _this.queryManager.stopQuery(qid);
            _this.reobserve();
        });
    };
    ObservableQuery.prototype.subscribeToMore = function (options) {
        var _this = this;
        var subscription = this.queryManager
            .startGraphQLSubscription({
            query: options.document,
            variables: options.variables,
            context: options.context,
        })
            .subscribe({
            next: function (subscriptionData) {
                var updateQuery = options.updateQuery;
                if (updateQuery) {
                    _this.updateQuery(function (previous, _a) {
                        var variables = _a.variables;
                        return updateQuery(previous, {
                            subscriptionData: subscriptionData,
                            variables: variables,
                        });
                    });
                }
            },
            error: function (err) {
                if (options.onError) {
                    options.onError(err);
                    return;
                }
                invariant.error('Unhandled GraphQL subscription error', err);
            },
        });
        this.subscriptions.add(subscription);
        return function () {
            if (_this.subscriptions.delete(subscription)) {
                subscription.unsubscribe();
            }
        };
    };
    ObservableQuery.prototype.setOptions = function (newOptions) {
        return this.reobserve(newOptions);
    };
    ObservableQuery.prototype.setVariables = function (variables) {
        if (equal(this.variables, variables)) {
            return this.observers.size
                ? this.result()
                : Promise.resolve();
        }
        this.options.variables = variables;
        if (!this.observers.size) {
            return Promise.resolve();
        }
        return this.reobserve({
            fetchPolicy: this.initialFetchPolicy,
            variables: variables,
        }, NetworkStatus.setVariables);
    };
    ObservableQuery.prototype.updateQuery = function (mapFn) {
        var _a;
        var queryManager = this.queryManager;
        var result = queryManager.cache.diff({
            query: this.options.query,
            variables: this.variables,
            previousResult: (_a = this.lastResult) === null || _a === void 0 ? void 0 : _a.data,
            returnPartialData: true,
            optimistic: false,
        }).result;
        var newResult = mapFn(result, {
            variables: this.variables,
        });
        if (newResult) {
            queryManager.cache.writeQuery({
                query: this.options.query,
                data: newResult,
                variables: this.variables,
            });
            queryManager.broadcastQueries();
        }
    };
    ObservableQuery.prototype.startPolling = function (pollInterval) {
        this.options.pollInterval = pollInterval;
        this.updatePolling();
    };
    ObservableQuery.prototype.stopPolling = function () {
        this.options.pollInterval = 0;
        this.updatePolling();
    };
    ObservableQuery.prototype.fetch = function (options, newNetworkStatus) {
        this.queryManager.setObservableQuery(this);
        return this.queryManager.fetchQueryObservable(this.queryId, options, newNetworkStatus);
    };
    ObservableQuery.prototype.updatePolling = function () {
        var _this = this;
        if (this.queryManager.ssrMode) {
            return;
        }
        var _a = this, pollingInfo = _a.pollingInfo, pollInterval = _a.options.pollInterval;
        if (!pollInterval) {
            if (pollingInfo) {
                clearTimeout(pollingInfo.timeout);
                delete this.pollingInfo;
            }
            return;
        }
        if (pollingInfo &&
            pollingInfo.interval === pollInterval) {
            return;
        }
        invariant(pollInterval, 'Attempted to start a polling query without a polling interval.');
        var info = pollingInfo || (this.pollingInfo = {});
        info.interval = pollInterval;
        var maybeFetch = function () {
            if (_this.pollingInfo) {
                if (!isNetworkRequestInFlight(_this.queryInfo.networkStatus)) {
                    _this.reobserve({
                        fetchPolicy: "network-only",
                    }, NetworkStatus.poll).then(poll, poll);
                }
                else {
                    poll();
                }
            }
            ;
        };
        var poll = function () {
            var info = _this.pollingInfo;
            if (info) {
                clearTimeout(info.timeout);
                info.timeout = setTimeout(maybeFetch, info.interval);
            }
        };
        poll();
    };
    ObservableQuery.prototype.updateLastResult = function (newResult) {
        var previousResult = this.lastResult;
        this.lastResult = newResult;
        this.lastResultSnapshot = this.queryManager.assumeImmutableResults
            ? newResult
            : cloneDeep(newResult);
        if (!isNonEmptyArray(newResult.errors)) {
            delete this.lastError;
        }
        return previousResult;
    };
    ObservableQuery.prototype.reobserve = function (newOptions, newNetworkStatus) {
        this.isTornDown = false;
        var useDisposableConcast = newNetworkStatus === NetworkStatus.refetch ||
            newNetworkStatus === NetworkStatus.fetchMore ||
            newNetworkStatus === NetworkStatus.poll;
        var oldVariables = this.options.variables;
        var options = useDisposableConcast
            ? compact(this.options, newOptions)
            : Object.assign(this.options, compact(newOptions));
        if (!useDisposableConcast) {
            this.updatePolling();
            if (newOptions &&
                newOptions.variables &&
                !newOptions.fetchPolicy &&
                !equal(newOptions.variables, oldVariables)) {
                options.fetchPolicy = this.initialFetchPolicy;
                if (newNetworkStatus === void 0) {
                    newNetworkStatus = NetworkStatus.setVariables;
                }
            }
        }
        var concast = this.fetch(options, newNetworkStatus);
        if (!useDisposableConcast) {
            if (this.concast) {
                this.concast.removeObserver(this.observer, true);
            }
            this.concast = concast;
        }
        concast.addObserver(this.observer);
        return concast.promise;
    };
    ObservableQuery.prototype.observe = function () {
        this.observer.next(this.getCurrentResult(false));
    };
    ObservableQuery.prototype.hasObservers = function () {
        return this.observers.size > 0;
    };
    ObservableQuery.prototype.tearDownQuery = function () {
        if (this.isTornDown)
            return;
        if (this.concast) {
            this.concast.removeObserver(this.observer);
            delete this.concast;
        }
        this.stopPolling();
        this.subscriptions.forEach(function (sub) { return sub.unsubscribe(); });
        this.subscriptions.clear();
        this.queryManager.stopQuery(this.queryId);
        this.observers.clear();
        this.isTornDown = true;
    };
    return ObservableQuery;
}(Observable));
export { ObservableQuery };
fixObservableSubclass(ObservableQuery);
function defaultSubscriptionObserverErrorCallback(error) {
    invariant.error('Unhandled error', error.message, error.stack);
}
export function applyNextFetchPolicy(options) {
    var _a = options.fetchPolicy, fetchPolicy = _a === void 0 ? "cache-first" : _a, nextFetchPolicy = options.nextFetchPolicy;
    if (nextFetchPolicy) {
        options.fetchPolicy = typeof nextFetchPolicy === "function"
            ? nextFetchPolicy.call(options, fetchPolicy)
            : nextFetchPolicy;
    }
}
//# sourceMappingURL=ObservableQuery.js.map