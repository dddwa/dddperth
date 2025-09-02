declare module "safe-routes" {
  type URLSearchParamsInit = string | string[][] | Record<string, string> | URLSearchParams;
  // symbol won't be a key of SearchParams
  type IsSearchParams<T> = symbol extends keyof T ? false : true;

  type ExportedQuery<T> = IsSearchParams<T> extends true ? T : never;

  export interface Routes {
    "": {
      params: never,
      query: ExportedQuery<import('app/routes/_layout._index').SearchParams>,
    },
    "/": {
      params: never,
      query: ExportedQuery<import('app/root').SearchParams>,
    },
    "/*": {
      params: {'*': string | number},
      query: ExportedQuery<import('app/routes/_layout.$').SearchParams>,
    },
    "/admin": {
      params: never,
      query: ExportedQuery<import('app/routes/admin._index').SearchParams>,
    },
    "/admin/content": {
      params: never,
      query: ExportedQuery<import('app/routes/admin.content').SearchParams>,
    },
    "/admin/dashboard": {
      params: never,
      query: ExportedQuery<import('app/routes/admin.dashboard').SearchParams>,
    },
    "/admin/settings": {
      params: never,
      query: ExportedQuery<import('app/routes/admin.settings').SearchParams>,
    },
    "/admin/voting": {
      params: never,
      query: ExportedQuery<import('app/routes/admin.voting').SearchParams>,
    },
    "/admin/voting-validation/stats/:runId": {
      params: {'runId': string | number},
      query: ExportedQuery<import('app/routes/admin.voting-validation.stats.$runId').SearchParams>,
    },
    "/admin/voting-validation/stats/:runId/download": {
      params: {'runId': string | number},
      query: ExportedQuery<import('app/routes/admin.voting-validation.stats.$runId.download').SearchParams>,
    },
    "/agenda/:year?": {
      params: {'year'?: string | number},
      query: ExportedQuery<import('app/routes/_layout.agenda.($year)').SearchParams>,
    },
    "/agenda/:year/talk/:sessionId": {
      params: {'year': string | number; 'sessionId': string | number},
      query: ExportedQuery<import('app/routes/_layout.agenda.$year.talk.$sessionId').SearchParams>,
    },
    "/api/voting/batch": {
      params: never,
      query: ExportedQuery<import('app/routes/api.voting.batch').SearchParams>,
    },
    "/api/voting/vote": {
      params: never,
      query: ExportedQuery<import('app/routes/api.voting.vote').SearchParams>,
    },
    "/app-agenda-grid": {
      params: never,
      query: ExportedQuery<import('app/routes/app-agenda-grid').SearchParams>,
    },
    "/app-agenda-sessions": {
      params: never,
      query: ExportedQuery<import('app/routes/app-agenda-sessions').SearchParams>,
    },
    "/app-agenda-speakers": {
      params: never,
      query: ExportedQuery<import('app/routes/app-agenda-speakers').SearchParams>,
    },
    "/app-announcements": {
      params: never,
      query: ExportedQuery<import('app/routes/app-announcements').SearchParams>,
    },
    "/app-config": {
      params: never,
      query: ExportedQuery<import('app/routes/app-config').SearchParams>,
    },
    "/app-content/*": {
      params: {'*': string | number},
      query: ExportedQuery<import('app/routes/app-content.$').SearchParams>,
    },
    "/auth/github/callback": {
      params: never,
      query: ExportedQuery<import('app/routes/auth.github.callback').SearchParams>,
    },
    "/auth/login": {
      params: never,
      query: ExportedQuery<import('app/routes/auth.login').SearchParams>,
    },
    "/auth/logout": {
      params: never,
      query: ExportedQuery<import('app/routes/auth.logout').SearchParams>,
    },
    "/blog": {
      params: never,
      query: ExportedQuery<import('app/routes/_layout.blog._index').SearchParams>,
    },
    "/blog/:slug": {
      params: {'slug': string | number},
      query: ExportedQuery<import('app/routes/_layout.blog.$slug').SearchParams>,
    },
    "/blog/rss.xml": {
      params: never,
      query: ExportedQuery<import('app/routes/blog.rss[.xml]').SearchParams>,
    },
    "/robots.txt": {
      params: never,
      query: ExportedQuery<import('app/routes/[robots.txt]').SearchParams>,
    },
    "/sitemap.xml": {
      params: never,
      query: ExportedQuery<import('app/routes/sitemap[.xml]').SearchParams>,
    },
    "/sponsors/:year?": {
      params: {'year'?: string | number},
      query: ExportedQuery<import('app/routes/_layout.sponsors.($year)').SearchParams>,
    },
    "/tito-webhook": {
      params: never,
      query: ExportedQuery<import('app/routes/tito-webhook').SearchParams>,
    },
    "/voting": {
      params: never,
      query: ExportedQuery<import('app/routes/_layout.voting').SearchParams>,
    }
  }

  type RoutesWithParams = Pick<
    Routes,
    {
      [K in keyof Routes]: Routes[K]["params"] extends Record<string, never> ? never : K
    }[keyof Routes]
  >;

  export type RouteId =
            | 'root'
            | 'routes/auth.github.callback'
            | 'routes/app-agenda-sessions'
            | 'routes/app-agenda-speakers'
            | 'routes/app-announcements'
            | 'routes/api.voting.batch'
            | 'routes/api.voting.vote'
            | 'routes/app-agenda-grid'
            | 'routes/blog.rss[.xml]'
            | 'routes/app-content.$'
            | 'routes/sitemap[.xml]'
            | 'routes/[robots.txt]'
            | 'routes/tito-webhook'
            | 'routes/auth.logout'
            | 'routes/app-config'
            | 'routes/auth.login'
            | 'routes/_layout'
            | 'routes/_layout.agenda.$year.talk.$sessionId'
            | 'routes/_layout.sponsors.($year)'
            | 'routes/_layout.agenda.($year)'
            | 'routes/_layout.blog._index'
            | 'routes/_layout.blog.$slug'
            | 'routes/_layout._index'
            | 'routes/_layout.voting'
            | 'routes/_layout.$'
            | 'routes/admin'
            | 'routes/admin.voting-validation.stats.$runId'
            | 'routes/admin.voting-validation.stats.$runId.download'
            | 'routes/admin.dashboard'
            | 'routes/admin.settings'
            | 'routes/admin.content'
            | 'routes/admin._index'
            | 'routes/admin.voting';

  export function $path<
    Route extends keyof Routes,
    Rest extends {
      params: Routes[Route]["params"];
      query?: Routes[Route]["query"];
    }
  >(
    ...args: Rest["params"] extends Record<string, never>
      ? [route: Route, query?: Rest["query"]]
      : [route: Route, params: Rest["params"], query?: Rest["query"]]
  ): string;

  export function $routeId(routeId: RouteId): RouteId;

  /** @deprecated Prefer to use React Router's typegen features instead. */
  export function $params<
    Route extends keyof RoutesWithParams,
    Params extends RoutesWithParams[Route]["params"]
  >(
      route: Route,
      params: { readonly [key: string]: string | undefined }
  ): {[K in keyof Params]: string};
}