import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/auth';

function RootGuard() {
  const { token, ready } = useAuth();
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    if (!ready) return;
    const inAuth = segments[0] === 'login';
    if (!token && !inAuth) router.replace('/login');
    if (token  &&  inAuth) router.replace('/');
  }, [token, ready, segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootGuard />
    </AuthProvider>
  );
}
