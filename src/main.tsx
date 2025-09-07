import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './index.css'
import Root from '@/routes/Root'
import Home from '@/routes/Home'
import StoriesAdmin from '@/routes/StoriesAdmin'
import About from '@/routes/About'
import Stories from '@/routes/Stories'
import Series from '@/routes/Series'
import Ilui from '@/routes/Ilui'
import Contact from '@/routes/Contact'
import Drive from '@/routes/Drive'
import DevGate from '@/components/DevGate'   // ⬅️ הוסף

function NotFound() { /* ... כמו שהיה ... */ }

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },

      // ⬇️ עוטפים את /admin ב-Gate
      { path: 'admin', element: <DevGate><StoriesAdmin /></DevGate> },

      { path: 'dashboard/stories', element: <Navigate to="/admin" replace /> },
      { path: 'about', element: <About /> },
      { path: 'stories', element: <Stories /> },
      { path: 'drive', element: <Drive /> },
      { path: 'series', element: <Series /> },
      { path: 'ilui', element: <Ilui /> },
      { path: 'contact', element: <Contact /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
