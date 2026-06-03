# Notification App Frontend (Stage 2)

A responsive Next.js application that displays:

- All notifications with pagination
- Priority notifications on a separate page
- Notification type filtering
- New vs viewed notification state using `localStorage`

## Run locally

```powershell
cd 'c:\Users\viren\2330792\notification_app_fe'
npm install
npm run dev
```

The app runs on `http://localhost:3000`.

## API configuration

The app uses the notification API endpoint:

`http://4.224.186.213/evaluation-services/notifications`

You can override it by setting:

```powershell
$env:NEXT_PUBLIC_NOTIF_API_URL='http://your-api/notifications'
```

## Pages

- `/` — All notifications with `limit` + `page`
- `/priority` — Top `n` priority notifications with category filtering
