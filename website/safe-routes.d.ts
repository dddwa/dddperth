declare module "safe-routes" {
  type URLSearchParamsInit = string | string[][] | Record<string, string> | URLSearchParams;
  // symbol won't be a key of SearchParams
  type IsSearchParams<T> = symbol extends keyof T ? false : true;

  type ExportedQuery<T> = IsSearchParams<T> extends true ? T : never;

  export interface Routes {
    "/": {
      params: never,
      query: ExportedQuery<import('app/routes/_layout._index.js').SearchParams>,
    },
    "/*": {
      params: {'*': string | number},
      query: ExportedQuery<import('app/routes/_layout.$.js').SearchParams>,
    },
    "/admin": {
      params: never,
      query: ExportedQuery<import('app/routes/admin._index.js').SearchParams>,
    },
    "/admin/content": {
      params: never,
      query: ExportedQuery<import('app/routes/admin.content.js').SearchParams>,
    },
    "/admin/dashboard": {
      params: never,
      query: ExportedQuery<import('app/routes/admin.dashboard.js').SearchParams>,
    },
    "/admin/settings": {
      params: never,
      query: ExportedQuery<import('app/routes/admin.settings.js').SearchParams>,
    },
    "/admin/voting": {
      params: never,
      query: ExportedQuery<import('app/routes/admin.voting.js').SearchParams>,
    },
    "/admin/voting-validation/stats/:runId": {
      params: {'runId': string | number},
      query: ExportedQuery<import('app/routes/admin.voting-validation.stats.$runId.js').SearchParams>,
    },
    "/admin/voting-validation/stats/:runId/download": {
      params: {'runId': string | number},
      query: ExportedQuery<import('app/routes/admin.voting-validation.stats.$runId.download.js').SearchParams>,
    },
    "/agenda/:year?": {
      params: {'year'?: string | number},
      query: ExportedQuery<import('app/routes/_layout.agenda.($year).js').SearchParams>,
    },
    "/agenda/:year/talk/:sessionId": {
      params: {'year': string | number; 'sessionId': string | number},
      query: ExportedQuery<import('app/routes/_layout.agenda.$year.talk.$sessionId.js').SearchParams>,
    },
    "/api/voting/batch": {
      params: never,
      query: ExportedQuery<import('app/routes/api.voting.batch.js').SearchParams>,
    },
    "/api/voting/vote": {
      params: never,
      query: ExportedQuery<import('app/routes/api.voting.vote.js').SearchParams>,
    },
    "/app": {
      params: never,
      query: ExportedQuery<import('app/routes/_layout.app.js').SearchParams>,
    },
    "/app-agenda-grid": {
      params: never,
      query: ExportedQuery<import('app/routes/app-agenda-grid.js').SearchParams>,
    },
    "/app-agenda-sessions": {
      params: never,
      query: ExportedQuery<import('app/routes/app-agenda-sessions.js').SearchParams>,
    },
    "/app-agenda-speakers": {
      params: never,
      query: ExportedQuery<import('app/routes/app-agenda-speakers.js').SearchParams>,
    },
    "/app-announcements": {
      params: never,
      query: ExportedQuery<import('app/routes/app-announcements.js').SearchParams>,
    },
    "/app-config": {
      params: never,
      query: ExportedQuery<import('app/routes/app-config.js').SearchParams>,
    },
    "/app-content/*": {
      params: {'*': string | number},
      query: ExportedQuery<import('app/routes/app-content.$.js').SearchParams>,
    },
    "/auth/github/callback": {
      params: never,
      query: ExportedQuery<import('app/routes/auth.github.callback.js').SearchParams>,
    },
    "/auth/login": {
      params: never,
      query: ExportedQuery<import('app/routes/auth.login.js').SearchParams>,
    },
    "/auth/logout": {
      params: never,
      query: ExportedQuery<import('app/routes/auth.logout.js').SearchParams>,
    },
    "/blog": {
      params: never,
      query: ExportedQuery<import('app/routes/_layout.blog._index.js').SearchParams>,
    },
    "/blog/:slug": {
      params: {'slug': string | number},
      query: ExportedQuery<import('app/routes/_layout.blog.$slug.js').SearchParams>,
    },
    "/blog/rss.xml": {
      params: never,
      query: ExportedQuery<import('app/routes/blog.rss[.xml].js').SearchParams>,
    },
    "/robots.txt": {
      params: never,
      query: ExportedQuery<import('app/routes/[robots.txt].js').SearchParams>,
    },
    "/sitemap.xml": {
      params: never,
      query: ExportedQuery<import('app/routes/sitemap[.xml].js').SearchParams>,
    },
    "/sponsors/:year?": {
      params: {'year'?: string | number},
      query: ExportedQuery<import('app/routes/_layout.sponsors.($year).js').SearchParams>,
    },
    "/voting": {
      params: never,
      query: ExportedQuery<import('app/routes/_layout.voting.js').SearchParams>,
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
            | 'routes/_layout.app'
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