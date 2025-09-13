﻿﻿import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import Root from '@/routes/Root'

function ErrorElement() {
  return <div className="p-6 text-center text-red-600" dir="rtl"><h2>אופס! משהו השתבש</h2><p>אנו מצטערים, התרחשה שגיאה בלתי צפויה.</p><a href="/" className="text-blue-600">חזרה לדף הבית</a></div>
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <ErrorElement />,
    // Wrap all children in Suspense for lazy loading
    // You can add a <Spinner /> or some loading indicator to the fallback
    children: [
      { index: true, lazy: () => import('@/routes/Home') },
      { path: 'login', lazy: () => import('@/routes/Login') },
      { path: 'about', lazy: () => import('@/routes/About') },
      { path: 'stories', lazy: () => import('@/routes/Stories') },
      { path: 'drive', lazy: () => import('@/routes/Drive') },
      { path: 'series', lazy: () => import('@/routes/Series') },
      { path: 'ilui', lazy: () => import('@/routes/Ilui') },
      { path: 'contact', lazy: () => import('@/routes/Contact') },
      { path: 'faq', lazy: () => import('@/routes/Faq') },
      { path: '*', lazy: () => import('@/routes/NotFound') },
    ],
  },
  // --- Admin Routes ---
  // Grouping admin routes under a separate top-level path
  // This uses a loader to check auth, which is more robust
  {
    path: 'admin',
    // The `lazy` property automatically looks for a `Component` export in the imported file.
    lazy: () => import('@/routes/AdminRoot'),
    children: [
      { index: true, lazy: () => import('@/routes/AdminHome') },
      { path: 'stories', lazy: () => import('@/routes/StoriesAdmin') },
      { path: 'series', lazy: () => import('@/routes/SeriesAdmin') },
      { path: 'series/:seriesId', lazy: () => import('@/routes/SeriesEditAdmin') },
      { path: 'categories', lazy: () => import('@/routes/CategoriesAdmin') },
      { path: 'faq', lazy: () => import('@/routes/AdminFaq') },
      { path: 'memorials', lazy: () => import('@/routes/MemorialsAdmin') },
    ],
  },
], {
  future: { v7_startTransition: true },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
