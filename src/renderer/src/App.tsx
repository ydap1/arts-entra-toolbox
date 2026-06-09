import { Suspense } from 'react'
import { AppProvider, useApp } from './store'
import Header from './components/Header'
import TenantBar from './components/TenantBar'
import NavSidebar from './components/NavSidebar'
import LogPane from './components/LogPane'
import StatusBar from './components/StatusBar'
import { toolComponent } from './nav'

function Shell(): JSX.Element {
  const { nav, logOpen } = useApp()
  const Tool = toolComponent(nav)

  return (
    <div className={`app${logOpen ? ' log-open' : ''}`}>
      <Header />
      <TenantBar />
      <div className="body">
        <NavSidebar />
        <div className="content">
          {/* Suspense boundary for React.lazy tool chunks */}
          <Suspense fallback={null}>{Tool ? <Tool /> : null}</Suspense>
        </div>
      </div>
      {logOpen && <LogPane />}
      <StatusBar />
    </div>
  )
}

export default function App(): JSX.Element {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
