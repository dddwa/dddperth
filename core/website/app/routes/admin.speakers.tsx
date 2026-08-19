import { Outlet } from 'react-router'

/**
 * Pass-through layout. Exists only because flat-routes nests
 * `admin.speakers.$sessionizeId.tsx` under this file (shared `admin.speakers`
 * prefix) — without this `<Outlet />` the child route would never render.
 * Auth is handled per-page by `admin.speakers._index.tsx` and
 * `admin.speakers.$sessionizeId.tsx` themselves (same as the top-level
 * `admin.tsx`/child pattern elsewhere).
 */
export default function AdminSpeakersLayout() {
    return <Outlet />
}
