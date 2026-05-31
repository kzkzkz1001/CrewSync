import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from '../context/auth';
import * as api from '../lib/api';

// Foreground notification behaviour
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

function RootGuard() {
  const { token, user, ready } = useAuth();
  const segments = useSegments();
  const router   = useRouter();

  // Auth redirect
  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === 'login';
    if (!token && !inAuth) router.replace('/login');
    if (token  &&  inAuth) router.replace('/');
  }, [token, ready, segments]);

  // Register FCM token once the user is logged in
  useEffect(() => {
    if (!token || !user) return;
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      const { data: fcmToken } = await Notifications.getDevicePushTokenAsync();
      await api.registerDevice(user.userId, fcmToken).catch(() => {});
    })();
  }, [token, user]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootGuard />
    </AuthProvider>
  );
}
