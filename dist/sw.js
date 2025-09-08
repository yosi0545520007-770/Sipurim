self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'עדכון חדש'
  const body  = data.body  || 'יש לנו סיפור חדש!'
  const icon  = data.icon  || '/logo.png'
  event.waitUntil(self.registration.showNotification(title, { body, icon }))
})
