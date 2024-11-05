declare module "remix-routes" {
  type URLSearchParamsInit = string | string[][] | Record<string, string> | URLSearchParams;
  // symbol won't be a key of SearchParams
  type IsSearchParams<T> = symbol extends keyof T ? false : true;
  
  type ExportedQuery<T> = IsSearchParams<T> extends true ? T : never;
  

  export interface Routes {
  
    "": {
      params: never,
      query: ExportedQuery<import('app/routes/_layout._index').SearchParams>,
    };
  
    "/": {
      params: never,
      query: ExportedQuery<import('app/root').SearchParams>,
    };
  
    "/*": {
      params: {
        "*": string | number;
      } ,
      query: ExportedQuery<import('app/routes/_layout.$').SearchParams>,
    };
  
    "/agenda/:year?": {
      params: {
        year?: string | number;
      } ,
      query: ExportedQuery<import('app/routes/_layout.agenda.($year)').SearchParams>,
    };
  
    "/agenda/:year/talk/:sessionId": {
      params: {
        year: string | number;sessionId: string | number;
      } ,
      query: ExportedQuery<import('app/routes/_layout.agenda.$year.talk.$sessionId').SearchParams>,
    };
  
    "/app-agenda-grid": {
      params: never,
      query: ExportedQuery<import('app/routes/app-agenda-grid').SearchParams>,
    };
  
    "/app-agenda-sessions": {
      params: never,
      query: ExportedQuery<import('app/routes/app-agenda-sessions').SearchParams>,
    };
  
    "/app-agenda-speakers": {
      params: never,
      query: ExportedQuery<import('app/routes/app-agenda-speakers').SearchParams>,
    };
  
    "/app-config": {
      params: never,
      query: ExportedQuery<import('app/routes/app-config').SearchParams>,
    };
  
    "/app-content/*": {
      params: {
        "*": string | number;
      } ,
      query: ExportedQuery<import('app/routes/app-content.$').SearchParams>,
    };
  
    "/blog": {
      params: never,
      query: ExportedQuery<import('app/routes/_layout.blog._index').SearchParams>,
    };
  
    "/blog/:slug": {
      params: {
        slug: string | number;
      } ,
      query: ExportedQuery<import('app/routes/_layout.blog.$slug').SearchParams>,
    };
  
    "/blog/rss.xml": {
      params: never,
      query: ExportedQuery<import('app/routes/blog.rss[.xml]').SearchParams>,
    };
  
  }

  type RoutesWithParams = Pick<
    Routes,
    {
      [K in keyof Routes]: Routes[K]["params"] extends Record<string, never> ? never : K
    }[keyof Routes]
  >;

  export type RouteId =
    | 'root'
    | 'routes/_layout'
    | 'routes/_layout._index'
    | 'routes/_layout.$'
    | 'routes/_layout.agenda.($year)'
    | 'routes/_layout.agenda.$year.talk.$sessionId'
    | 'routes/_layout.blog._index'
    | 'routes/_layout.blog.$slug'
    | 'routes/app-agenda-grid'
    | 'routes/app-agenda-sessions'
    | 'routes/app-agenda-speakers'
    | 'routes/app-config'
    | 'routes/app-content.$'
    | 'routes/blog.rss[.xml]';

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

  export function $params<
    Route extends keyof RoutesWithParams,
    Params extends RoutesWithParams[Route]["params"]
  >(
      route: Route,
      params: { readonly [key: string]: string | undefined }
  ): {[K in keyof Params]: string};

  export function $routeId(routeId: RouteId): RouteId;
}