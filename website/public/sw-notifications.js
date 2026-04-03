// Loud Legacy — Service Worker for scheduled activity notifications
const CACHE_NAME = 'll-notifications-v1'

// Install
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATIONS') {
    // Store upcoming reminders
    const reminders = event.data.reminders || []
    self.reminders = reminders
    scheduleChecks()
  }

  if (event.data?.type === 'CHECK_NOW') {
    checkReminders()
  }
})

// Check reminders every 30 seconds
let checkInterval = null
function scheduleChecks() {
  if (checkInterval) clearInterval(checkInterval)
  checkInterval = setInterval(checkReminders, 30000)
  checkReminders()
}

function checkReminders() {
  if (!self.reminders?.length) return

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  for (const reminder of self.reminders) {
    if (reminder.fired) continue
    if (reminder.date !== todayStr) continue

    const [h, m] = (reminder.time || '').split(':').map(Number)
    if (isNaN(h) || isNaN(m)) continue
    const reminderMinutes = h * 60 + m

    // Fire if within 2-minute window
    if (currentMinutes >= reminderMinutes && currentMinutes <= reminderMinutes + 2) {
      reminder.fired = true
      self.registration.showNotification(reminder.title, {
        body: reminder.body,
        icon: '/favicon.svg',
        tag: `task-${reminder.id}`,
        requireInteraction: true,
        data: { url: '/app/crm/tasks' },
      })
    }
  }
}

// Handle notification click — focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes('/app') && 'focus' in client) {
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/app/crm/tasks')
      }
    })
  )
})
