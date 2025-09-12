﻿﻿﻿import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './index.css'
import Root from '@/routes/Root'
import AdminRoot from '@/routes/AdminRoot'
import AdminHome from '@/routes/AdminHome'
import Login from '@/routes/Login'
import Home from '@/routes/Home'
import StoriesAdmin from '@/routes/StoriesAdmin'
import About from '@/routes/About'
import Stories from '@/routes/Stories'
import SeriesEditAdmin from '@/routes/SeriesEditAdmin'
import SeriesAdmin from '@/routes/SeriesAdmin'
import Series from '@/routes/Series'
import Ilui from '@/routes/Ilui'
import Contact from '@/routes/Contact'
import CategoriesAdmin from '@/routes/CategoriesAdmin'
import AdminFaq from '@/routes/AdminFaq'
import RequireAuth from '@/components/RequireAuth'

function NotFound() {
  return <div className="p-6 text-center" dir="rtl"><h2>404 - דף לא נמצא</h2><p>הדף שחיפשת לא קיים.</p><a href="/" className="text-blue-600">חזרה לדף הבית</a></div>
}

function ErrorElement() {
  return <div className="p-6 text-center text-red-600" dir="rtl"><h2>אופס! משהו השתבש</h2><p>אנו מצטערים, התרחשה שגיאה בלתי צפויה.</p><a href="/" className="text-blue-600">חזרה לדף הבית</a></div>
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <Root><ErrorElement /></Root>,
    children: [
      { index: true, element: <Home /> },

      // --- Admin Routes ---
      {
        path: 'admin',
        element: <AdminRoot />,
        children: [
          { index: true, element: <AdminHome /> },
          { path: 'stories', element: <StoriesAdmin /> },
          { path: 'series', element: <SeriesAdmin /> },
          { path: 'series/:seriesId', element: <SeriesEditAdmin /> },
          { path: 'categories', element: <CategoriesAdmin /> },
          { path: 'faq', element: <AdminFaq /> },
        ],
      },
      { path: 'login', element: <Login /> },

      { path: 'dashboard/stories', element: <Navigate to="/admin" replace /> },

      { path: 'about', element: <About /> },
      { path: 'stories', element: <Stories /> },
      { path: 'series', element: <Series /> },
      { path: 'ilui', element: <Ilui /> },
      { path: 'contact', element: <Contact /> },
      { path: '*', element: <NotFound /> },
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
