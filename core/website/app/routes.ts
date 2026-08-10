import { type RouteConfig } from '@react-router/dev/routes'
import { flatRoutes } from '@react-router/fs-routes'

// Colocated vitest files must be excluded or flatRoutes registers them as
// live routes (e.g. /voting/test) and bundles vitest into the worker.
export default flatRoutes({ ignoredRouteFiles: ['**/*.test.*'] }) satisfies RouteConfig
