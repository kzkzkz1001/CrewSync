import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/auth';
import * as api from '../lib/api';

export default function LoginScreen() {
  const { login } = useAuth();
  const router    = useRouter();
  const [email,    setEmail]    = useState('carol@crewsync.dev');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleLogin() {
    setError(''); setLoading(true);
    try {
      const { accessToken } = await api.login(email, password);
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      await login(accessToken, { userId: payload.sub, email: payload.email });
      router.replace('/');
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.appName}>CrewSync</Text>
        <Text style={styles.role}>Staff</Text>

        <TextInput
          style={styles.input} value={email} onChangeText={setEmail}
          placeholder="Email" autoCapitalize="none" keyboardType="email-address"
        />
        <TextInput
          style={styles.input} value={password} onChangeText={setPassword}
          placeholder="Password" secureTextEntry
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Sign in</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', padding: 24 },
  card:       { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 4 },
  appName:    { fontSize: 24, fontWeight: '700', textAlign: 'center', color: '#111' },
  role:       { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  input:      { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, marginBottom: 12 },
  error:      { color: '#dc2626', fontSize: 13, marginBottom: 8 },
  button:     { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
