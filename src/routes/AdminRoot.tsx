import { Outlet, NavLink } from 'react-router-dom'

function AdminRootLayout() {
  const navItems = [
    { to: '/admin', label: 'דשבורד' },
    { to: '/admin/stories', label: 'ניהול סיפורים' },
    { to: '/admin/series', label: 'ניהול סדרות' },
    { to: '/admin/categories', label: 'ניהול קטגוריות' },
    { to: '/admin/faq', label: 'ניהול שאלות נפוצות' },
    { to: '/admin/memorials', label: 'ניהול הנצחות' },
  ]

  return (
    <div className="flex min-h-screen" dir="rtl">
      <aside className="w-64 bg-gray-800 text-white p-4">
        <h2 className="text-xl font-bold mb-6">ניהול</h2>
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg ${isActive ? 'bg-gray-700' : 'hover:bg-gray-700'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

export { AdminRootLayout as Component }