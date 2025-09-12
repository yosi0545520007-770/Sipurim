import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import Root from './routes/Root'
import Home from './routes/Home'
import Dashboard from './routes/Dashboard'
import About from './routes/About'
import Stories from './routes/Stories'
import Series from './routes/Series'
import Ilui from './routes/Ilui'
import Contact from './routes/Contact'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      { index: true, element: <Home /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'about', element: <About /> },
      { path: 'stories', element: <Stories /> },
      { path: 'series', element: <Series /> },
      { path: 'ilui', element: <Ilui /> },
      { path: 'contact', element: <Contact /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
