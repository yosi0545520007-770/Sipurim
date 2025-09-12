import { Outlet, Link, NavLink } from 'react-router-dom'

export default function Root() {
  return (
    <main dir="rtl" className="min-h-screen">
      <header className="sticky top-0 bg-white/80 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold text-xl">ספריית הסיפורים</span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <NavLink to="/about" className={({isActive})=>isActive?'text-blue-600':'hover:text-blue-600'}>אודות</NavLink>
            <NavLink to="/stories" className={({isActive})=>isActive?'text-blue-600':'hover:text-blue-600'}>כל הסיפורים</NavLink>
            <NavLink to="/series" className={({isActive})=>isActive?'text-blue-600':'hover:text-blue-600'}>סיפורים בהמשכים</NavLink>
            <NavLink to="/ilui" className={({isActive})=>isActive?'text-blue-600':'hover:text-blue-600'}>לעילוי נשמת</NavLink>
            <NavLink to="/contact" className={({isActive})=>isActive?'text-blue-600':'hover:text-blue-600'}>צור קשר</NavLink>
            <NavLink to="/dashboard" className="ml-4 rounded-lg bg-blue-600 text-white px-3 py-1">דשבורד</NavLink>
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="border-t py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} ספריית הסיפורים
      </footer>
    </main>
  )
}
