import type { MetaFunction } from '@remix-run/node'
import { Outlet } from '@remix-run/react'
import { Header } from '../components/header/header'

export const meta: MetaFunction = () => {
    return [{ title: 'New Remix App' }, { name: 'description', content: 'Welcome to Remix!' }]
}

export default function Index() {
    return (
        <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: '1.8' }}>
            <Header />
            <Outlet />
        </div>
    )
}
