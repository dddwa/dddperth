import type { MetaFunction } from '@remix-run/node'
import { Outlet } from '@remix-run/react'
import { Acknowledgement } from '../components/acknowledgement'
import { Footer } from '../components/footer/footer'
import { Header } from '../components/header/header'
import { conferenceConfig } from '../config/conference-config'

export const meta: MetaFunction = () => {
  return [{ title: conferenceConfig.name }, { name: 'description', content: conferenceConfig.description }]
}

export default function Index() {
  return (
    <div>
      <Header />
      <Outlet />
      <Footer />
      <Acknowledgement />
    </div>
  )
}
