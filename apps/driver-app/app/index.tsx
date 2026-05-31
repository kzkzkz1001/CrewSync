import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/auth';
import * as api from '../lib/api';
import { WS_EVENTS } from '@crewsync/types';

const GATEWAY = Constants.expoConfig?.extra?.gatewayUrl ?? 'http://localhost:3000';

type TripStatus = 'idle' | 'active';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [shifts,     setShifts]     = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tripStatus, setTripStatus] = useState<TripStatus>('idle');
  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);

  const socketRef   = useRef<Socket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchShifts();
    return () => stopTrip();
  }, []);

  async function fetchShifts() {
    try {
      const all = await api.getShifts();
      // Show OPTIMIZED and ACTIVE shifts only
      setShifts(all.filter((s: any) => ['OPTIMIZED', 'ACTIVE'].includes(s.status)));
    } catch {
      Alert.alert('Error', 'Could not load shifts');
    } finally {
      setLoading(false);
    }
  }

  async function startTrip(shift: any) {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is required to start a trip.');
      return;
    }

    // Mark shift as ACTIVE
    await api.updateShiftStatus(shift.id, 'ACTIVE');
    setActiveShiftId(shift.id);

    const socket = io(`${GATEWAY}/gps`);
    socketRef.current = socket;

    intervalRef.current = setInterval(async () => {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      socket.emit(WS_EVENTS.GPS_UPDATE, {
        vehicleId: shift.vehicleId,
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        timestamp: new Date().toISOString(),
      });
    }, 10_000);

    setTripStatus('active');
    fetchShifts();
  }

  async function stopTrip() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    socketRef.current?.disconnect();
    socketRef.current = null;
    setTripStatus('idle');

    if (activeShiftId) {
      await api.updateShiftStatus(activeShiftId, 'COMPLETED').catch(() => {});
      setActiveShiftId(null);
      fetchShifts();
    }
  }

  function renderShift({ item: shift }: { item: any }) {
    const isThisActive = activeShiftId === shift.id;
    const canStart = shift.status === 'OPTIMIZED' || shift.status === 'ACTIVE';

    return (
      <View style={styles.shiftCard}>
        <View style={styles.shiftHeader}>
          <Text style={styles.shiftName}>{shift.eventName}</Text>
          <StatusPill status={shift.status} />
        </View>
        <Text style={styles.shiftMeta}>
          {new Date(shift.startTime).toLocaleString([], {
            weekday: 'short', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </Text>
        <Text style={styles.shiftMeta}>
          {shift.pickupNodes?.length ?? 0} pickup nodes · {shift.staff?.length ?? 0} staff
        </Text>

        <View style={styles.shiftActions}>
          <TouchableOpacity
            style={styles.mapBtn}
            onPress={() => router.push(`/trip/${shift.id}`)}
          >
            <Text style={styles.mapBtnText}>View Map</Text>
          </TouchableOpacity>

          {canStart && tripStatus === 'idle' && (
            <TouchableOpacity style={styles.startBtn} onPress={() => startTrip(shift)}>
              <Text style={styles.startBtnText}>Start Trip</Text>
            </TouchableOpacity>
          )}
          {isThisActive && tripStatus === 'active' && (
            <TouchableOpacity style={styles.stopBtn} onPress={stopTrip}>
              <Text style={styles.stopBtnText}>End Trip</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Shifts</Text>
          <Text style={styles.headerSub}>{user?.email}</Text>
        </View>
        <TouchableOpacity onPress={() => { stopTrip(); logout(); }}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Trip active banner */}
      {tripStatus === 'active' && (
        <View style={styles.activeBanner}>
          <Text style={styles.activeBannerText}>🟢 Trip in progress — GPS streaming</Text>
        </View>
      )}

      {loading
        ? <ActivityIndicator style={{ marginTop: 40 }} />
        : (
          <FlatList
            data={shifts}
            keyExtractor={(s) => s.id}
            renderItem={renderShift}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            ListEmptyComponent={
              <Text style={styles.empty}>No upcoming shifts. Check back later.</Text>
            }
          />
        )
      }
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  const colours: Record<string, { bg: string; text: string }> = {
    OPTIMIZED: { bg: '#dbeafe', text: '#1d4ed8' },
    ACTIVE:    { bg: '#dcfce7', text: '#15803d' },
  };
  const c = colours[status] ?? { bg: '#f3f4f6', text: '#6b7280' };
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.pillText, { color: c.text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#f9fafb' },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTitle:      { fontSize: 20, fontWeight: '700', color: '#111' },
  headerSub:        { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  logoutText:       { fontSize: 13, color: '#6b7280' },
  activeBanner:     { backgroundColor: '#dcfce7', paddingHorizontal: 20, paddingVertical: 10 },
  activeBannerText: { fontSize: 13, color: '#15803d', fontWeight: '500' },
  shiftCard:        { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  shiftHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  shiftName:        { fontSize: 16, fontWeight: '600', color: '#111', flex: 1, marginRight: 8 },
  shiftMeta:        { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  shiftActions:     { flexDirection: 'row', gap: 8, marginTop: 14 },
  mapBtn:           { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  mapBtnText:       { fontSize: 13, color: '#374151', fontWeight: '500' },
  startBtn:         { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  startBtnText:     { fontSize: 13, color: '#fff', fontWeight: '600' },
  stopBtn:          { backgroundColor: '#dc2626', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  stopBtnText:      { fontSize: 13, color: '#fff', fontWeight: '600' },
  pill:             { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  pillText:         { fontSize: 11, fontWeight: '600' },
  empty:            { textAlign: 'center', color: '#9ca3af', fontSize: 14, marginTop: 40 },
});
