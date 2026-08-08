import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { ActivityItem, CreatePositionBody, CreateSignalBody, CreateStrategyBody, CreateTokenBody, DashboardSummary, GetRecentActivityParams, HealthStatus, ListSignalsParams, ListTokensParams, Position, Signal, Strategy, Token, UpdatePositionBody, UpdateSignalBody, UpdateStrategyBody } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * Returns server health status
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary List all meme coin tokens
 */
export declare const getListTokensUrl: (params?: ListTokensParams) => string;
export declare const listTokens: (params?: ListTokensParams, options?: RequestInit) => Promise<Token[]>;
export declare const getListTokensQueryKey: (params?: ListTokensParams) => readonly ["/api/tokens", ...ListTokensParams[]];
export declare const getListTokensQueryOptions: <TData = Awaited<ReturnType<typeof listTokens>>, TError = ErrorType<unknown>>(params?: ListTokensParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTokens>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTokens>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTokensQueryResult = NonNullable<Awaited<ReturnType<typeof listTokens>>>;
export type ListTokensQueryError = ErrorType<unknown>;
/**
 * @summary List all meme coin tokens
 */
export declare function useListTokens<TData = Awaited<ReturnType<typeof listTokens>>, TError = ErrorType<unknown>>(params?: ListTokensParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTokens>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Add a meme coin token to watchlist
 */
export declare const getCreateTokenUrl: () => string;
export declare const createToken: (createTokenBody: CreateTokenBody, options?: RequestInit) => Promise<Token>;
export declare const getCreateTokenMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createToken>>, TError, {
        data: BodyType<CreateTokenBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createToken>>, TError, {
    data: BodyType<CreateTokenBody>;
}, TContext>;
export type CreateTokenMutationResult = NonNullable<Awaited<ReturnType<typeof createToken>>>;
export type CreateTokenMutationBody = BodyType<CreateTokenBody>;
export type CreateTokenMutationError = ErrorType<unknown>;
/**
 * @summary Add a meme coin token to watchlist
 */
export declare const useCreateToken: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createToken>>, TError, {
        data: BodyType<CreateTokenBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createToken>>, TError, {
    data: BodyType<CreateTokenBody>;
}, TContext>;
/**
 * @summary Get a token by ID
 */
export declare const getGetTokenUrl: (id: number) => string;
export declare const getToken: (id: number, options?: RequestInit) => Promise<Token>;
export declare const getGetTokenQueryKey: (id: number) => readonly [`/api/tokens/${number}`];
export declare const getGetTokenQueryOptions: <TData = Awaited<ReturnType<typeof getToken>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getToken>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getToken>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTokenQueryResult = NonNullable<Awaited<ReturnType<typeof getToken>>>;
export type GetTokenQueryError = ErrorType<unknown>;
/**
 * @summary Get a token by ID
 */
export declare function useGetToken<TData = Awaited<ReturnType<typeof getToken>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getToken>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Remove token from watchlist
 */
export declare const getDeleteTokenUrl: (id: number) => string;
export declare const deleteToken: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteTokenMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteToken>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteToken>>, TError, {
    id: number;
}, TContext>;
export type DeleteTokenMutationResult = NonNullable<Awaited<ReturnType<typeof deleteToken>>>;
export type DeleteTokenMutationError = ErrorType<unknown>;
/**
 * @summary Remove token from watchlist
 */
export declare const useDeleteToken: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteToken>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteToken>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List AI trading signals
 */
export declare const getListSignalsUrl: (params?: ListSignalsParams) => string;
export declare const listSignals: (params?: ListSignalsParams, options?: RequestInit) => Promise<Signal[]>;
export declare const getListSignalsQueryKey: (params?: ListSignalsParams) => readonly ["/api/signals", ...ListSignalsParams[]];
export declare const getListSignalsQueryOptions: <TData = Awaited<ReturnType<typeof listSignals>>, TError = ErrorType<unknown>>(params?: ListSignalsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSignals>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSignals>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSignalsQueryResult = NonNullable<Awaited<ReturnType<typeof listSignals>>>;
export type ListSignalsQueryError = ErrorType<unknown>;
/**
 * @summary List AI trading signals
 */
export declare function useListSignals<TData = Awaited<ReturnType<typeof listSignals>>, TError = ErrorType<unknown>>(params?: ListSignalsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSignals>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a trading signal
 */
export declare const getCreateSignalUrl: () => string;
export declare const createSignal: (createSignalBody: CreateSignalBody, options?: RequestInit) => Promise<Signal>;
export declare const getCreateSignalMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSignal>>, TError, {
        data: BodyType<CreateSignalBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSignal>>, TError, {
    data: BodyType<CreateSignalBody>;
}, TContext>;
export type CreateSignalMutationResult = NonNullable<Awaited<ReturnType<typeof createSignal>>>;
export type CreateSignalMutationBody = BodyType<CreateSignalBody>;
export type CreateSignalMutationError = ErrorType<unknown>;
/**
 * @summary Create a trading signal
 */
export declare const useCreateSignal: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSignal>>, TError, {
        data: BodyType<CreateSignalBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSignal>>, TError, {
    data: BodyType<CreateSignalBody>;
}, TContext>;
/**
 * @summary Get a signal by ID
 */
export declare const getGetSignalUrl: (id: number) => string;
export declare const getSignal: (id: number, options?: RequestInit) => Promise<Signal>;
export declare const getGetSignalQueryKey: (id: number) => readonly [`/api/signals/${number}`];
export declare const getGetSignalQueryOptions: <TData = Awaited<ReturnType<typeof getSignal>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSignal>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSignal>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSignalQueryResult = NonNullable<Awaited<ReturnType<typeof getSignal>>>;
export type GetSignalQueryError = ErrorType<unknown>;
/**
 * @summary Get a signal by ID
 */
export declare function useGetSignal<TData = Awaited<ReturnType<typeof getSignal>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSignal>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update signal status
 */
export declare const getUpdateSignalUrl: (id: number) => string;
export declare const updateSignal: (id: number, updateSignalBody: UpdateSignalBody, options?: RequestInit) => Promise<Signal>;
export declare const getUpdateSignalMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSignal>>, TError, {
        id: number;
        data: BodyType<UpdateSignalBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateSignal>>, TError, {
    id: number;
    data: BodyType<UpdateSignalBody>;
}, TContext>;
export type UpdateSignalMutationResult = NonNullable<Awaited<ReturnType<typeof updateSignal>>>;
export type UpdateSignalMutationBody = BodyType<UpdateSignalBody>;
export type UpdateSignalMutationError = ErrorType<unknown>;
/**
 * @summary Update signal status
 */
export declare const useUpdateSignal: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSignal>>, TError, {
        id: number;
        data: BodyType<UpdateSignalBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateSignal>>, TError, {
    id: number;
    data: BodyType<UpdateSignalBody>;
}, TContext>;
/**
 * @summary List portfolio positions
 */
export declare const getListPositionsUrl: () => string;
export declare const listPositions: (options?: RequestInit) => Promise<Position[]>;
export declare const getListPositionsQueryKey: () => readonly ["/api/portfolio"];
export declare const getListPositionsQueryOptions: <TData = Awaited<ReturnType<typeof listPositions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPositions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listPositions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListPositionsQueryResult = NonNullable<Awaited<ReturnType<typeof listPositions>>>;
export type ListPositionsQueryError = ErrorType<unknown>;
/**
 * @summary List portfolio positions
 */
export declare function useListPositions<TData = Awaited<ReturnType<typeof listPositions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listPositions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Add a portfolio position
 */
export declare const getCreatePositionUrl: () => string;
export declare const createPosition: (createPositionBody: CreatePositionBody, options?: RequestInit) => Promise<Position>;
export declare const getCreatePositionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPosition>>, TError, {
        data: BodyType<CreatePositionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createPosition>>, TError, {
    data: BodyType<CreatePositionBody>;
}, TContext>;
export type CreatePositionMutationResult = NonNullable<Awaited<ReturnType<typeof createPosition>>>;
export type CreatePositionMutationBody = BodyType<CreatePositionBody>;
export type CreatePositionMutationError = ErrorType<unknown>;
/**
 * @summary Add a portfolio position
 */
export declare const useCreatePosition: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createPosition>>, TError, {
        data: BodyType<CreatePositionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createPosition>>, TError, {
    data: BodyType<CreatePositionBody>;
}, TContext>;
/**
 * @summary Update position
 */
export declare const getUpdatePositionUrl: (id: number) => string;
export declare const updatePosition: (id: number, updatePositionBody: UpdatePositionBody, options?: RequestInit) => Promise<Position>;
export declare const getUpdatePositionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updatePosition>>, TError, {
        id: number;
        data: BodyType<UpdatePositionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updatePosition>>, TError, {
    id: number;
    data: BodyType<UpdatePositionBody>;
}, TContext>;
export type UpdatePositionMutationResult = NonNullable<Awaited<ReturnType<typeof updatePosition>>>;
export type UpdatePositionMutationBody = BodyType<UpdatePositionBody>;
export type UpdatePositionMutationError = ErrorType<unknown>;
/**
 * @summary Update position
 */
export declare const useUpdatePosition: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updatePosition>>, TError, {
        id: number;
        data: BodyType<UpdatePositionBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updatePosition>>, TError, {
    id: number;
    data: BodyType<UpdatePositionBody>;
}, TContext>;
/**
 * @summary Remove a position
 */
export declare const getDeletePositionUrl: (id: number) => string;
export declare const deletePosition: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeletePositionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deletePosition>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deletePosition>>, TError, {
    id: number;
}, TContext>;
export type DeletePositionMutationResult = NonNullable<Awaited<ReturnType<typeof deletePosition>>>;
export type DeletePositionMutationError = ErrorType<unknown>;
/**
 * @summary Remove a position
 */
export declare const useDeletePosition: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deletePosition>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deletePosition>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary List trading strategies
 */
export declare const getListStrategiesUrl: () => string;
export declare const listStrategies: (options?: RequestInit) => Promise<Strategy[]>;
export declare const getListStrategiesQueryKey: () => readonly ["/api/strategies"];
export declare const getListStrategiesQueryOptions: <TData = Awaited<ReturnType<typeof listStrategies>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listStrategies>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listStrategies>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListStrategiesQueryResult = NonNullable<Awaited<ReturnType<typeof listStrategies>>>;
export type ListStrategiesQueryError = ErrorType<unknown>;
/**
 * @summary List trading strategies
 */
export declare function useListStrategies<TData = Awaited<ReturnType<typeof listStrategies>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listStrategies>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a trading strategy
 */
export declare const getCreateStrategyUrl: () => string;
export declare const createStrategy: (createStrategyBody: CreateStrategyBody, options?: RequestInit) => Promise<Strategy>;
export declare const getCreateStrategyMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createStrategy>>, TError, {
        data: BodyType<CreateStrategyBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createStrategy>>, TError, {
    data: BodyType<CreateStrategyBody>;
}, TContext>;
export type CreateStrategyMutationResult = NonNullable<Awaited<ReturnType<typeof createStrategy>>>;
export type CreateStrategyMutationBody = BodyType<CreateStrategyBody>;
export type CreateStrategyMutationError = ErrorType<unknown>;
/**
 * @summary Create a trading strategy
 */
export declare const useCreateStrategy: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createStrategy>>, TError, {
        data: BodyType<CreateStrategyBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createStrategy>>, TError, {
    data: BodyType<CreateStrategyBody>;
}, TContext>;
/**
 * @summary Get a strategy by ID
 */
export declare const getGetStrategyUrl: (id: number) => string;
export declare const getStrategy: (id: number, options?: RequestInit) => Promise<Strategy>;
export declare const getGetStrategyQueryKey: (id: number) => readonly [`/api/strategies/${number}`];
export declare const getGetStrategyQueryOptions: <TData = Awaited<ReturnType<typeof getStrategy>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStrategy>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getStrategy>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetStrategyQueryResult = NonNullable<Awaited<ReturnType<typeof getStrategy>>>;
export type GetStrategyQueryError = ErrorType<unknown>;
/**
 * @summary Get a strategy by ID
 */
export declare function useGetStrategy<TData = Awaited<ReturnType<typeof getStrategy>>, TError = ErrorType<unknown>>(id: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getStrategy>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Update a strategy
 */
export declare const getUpdateStrategyUrl: (id: number) => string;
export declare const updateStrategy: (id: number, updateStrategyBody: UpdateStrategyBody, options?: RequestInit) => Promise<Strategy>;
export declare const getUpdateStrategyMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateStrategy>>, TError, {
        id: number;
        data: BodyType<UpdateStrategyBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateStrategy>>, TError, {
    id: number;
    data: BodyType<UpdateStrategyBody>;
}, TContext>;
export type UpdateStrategyMutationResult = NonNullable<Awaited<ReturnType<typeof updateStrategy>>>;
export type UpdateStrategyMutationBody = BodyType<UpdateStrategyBody>;
export type UpdateStrategyMutationError = ErrorType<unknown>;
/**
 * @summary Update a strategy
 */
export declare const useUpdateStrategy: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateStrategy>>, TError, {
        id: number;
        data: BodyType<UpdateStrategyBody>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateStrategy>>, TError, {
    id: number;
    data: BodyType<UpdateStrategyBody>;
}, TContext>;
/**
 * @summary Delete a strategy
 */
export declare const getDeleteStrategyUrl: (id: number) => string;
export declare const deleteStrategy: (id: number, options?: RequestInit) => Promise<void>;
export declare const getDeleteStrategyMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteStrategy>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteStrategy>>, TError, {
    id: number;
}, TContext>;
export type DeleteStrategyMutationResult = NonNullable<Awaited<ReturnType<typeof deleteStrategy>>>;
export type DeleteStrategyMutationError = ErrorType<unknown>;
/**
 * @summary Delete a strategy
 */
export declare const useDeleteStrategy: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteStrategy>>, TError, {
        id: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteStrategy>>, TError, {
    id: number;
}, TContext>;
/**
 * @summary Get dashboard summary stats
 */
export declare const getGetDashboardSummaryUrl: () => string;
export declare const getDashboardSummary: (options?: RequestInit) => Promise<DashboardSummary>;
export declare const getGetDashboardSummaryQueryKey: () => readonly ["/api/dashboard/summary"];
export declare const getGetDashboardSummaryQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardSummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardSummary>>>;
export type GetDashboardSummaryQueryError = ErrorType<unknown>;
/**
 * @summary Get dashboard summary stats
 */
export declare function useGetDashboardSummary<TData = Awaited<ReturnType<typeof getDashboardSummary>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardSummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Get top trending meme tokens
 */
export declare const getGetTrendingTokensUrl: () => string;
export declare const getTrendingTokens: (options?: RequestInit) => Promise<Token[]>;
export declare const getGetTrendingTokensQueryKey: () => readonly ["/api/dashboard/trending"];
export declare const getGetTrendingTokensQueryOptions: <TData = Awaited<ReturnType<typeof getTrendingTokens>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTrendingTokens>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTrendingTokens>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTrendingTokensQueryResult = NonNullable<Awaited<ReturnType<typeof getTrendingTokens>>>;
export type GetTrendingTokensQueryError = ErrorType<unknown>;
/**
 * @summary Get top trending meme tokens
 */
export declare function useGetTrendingTokens<TData = Awaited<ReturnType<typeof getTrendingTokens>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTrendingTokens>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Recent trading activity feed
 */
export declare const getGetRecentActivityUrl: (params?: GetRecentActivityParams) => string;
export declare const getRecentActivity: (params?: GetRecentActivityParams, options?: RequestInit) => Promise<ActivityItem[]>;
export declare const getGetRecentActivityQueryKey: (params?: GetRecentActivityParams) => readonly ["/api/dashboard/activity", ...GetRecentActivityParams[]];
export declare const getGetRecentActivityQueryOptions: <TData = Awaited<ReturnType<typeof getRecentActivity>>, TError = ErrorType<unknown>>(params?: GetRecentActivityParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRecentActivity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRecentActivity>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRecentActivityQueryResult = NonNullable<Awaited<ReturnType<typeof getRecentActivity>>>;
export type GetRecentActivityQueryError = ErrorType<unknown>;
/**
 * @summary Recent trading activity feed
 */
export declare function useGetRecentActivity<TData = Awaited<ReturnType<typeof getRecentActivity>>, TError = ErrorType<unknown>>(params?: GetRecentActivityParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRecentActivity>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map