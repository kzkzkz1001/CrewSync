import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Animated,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { io } from 'socket.io-client';
import { useAuth } from '../context/auth';
import * as api from '../lib/api';
import { WS_EVENTS } from '@crewsync/types';
import type { GpsPayload } from '@crewsync/types';

const GATEWAY = Constants.expoConfig?.extra?.gatewayUrl ?? 'http://localhost:3000';

export default function StaffHomeScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [loading,     setLoading]     = useState(true);
  const [myShift,     setMyShift]     = useState<any>(null);
  const [myNode,      setMyNode]      = useState<any>(null);
  const [vehiclePos,  setVehiclePos]  = useState<{ lat: number; lng: number } | null>(null);
  const [distanceKm,  setDistanceKm]  = useState<number | null>(null);
  const [alertMsg,    setAlertMsg]    = useState<string | null>(null);
  const alertAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadShift();
  }, [user]);

  useEffect(() => {
    if (!myShift) return;

    // Connect to GPS stream to track vehicle
    const socket = io(`${GATEWAY}/gps`);
    socket.on(WS_EVENTS.GPS_UPDATE, (payload: GpsPayload) => {
      setVehiclePos({ lat: payload.lat, lng: payload.lng });
      if (myNode) {
        const d = haversine(payload.lat, payload.lng, myNode.lat, myNode.lng);
        setDistanceKm(d / 1000);
      }
    });

    // Listen for foreground push notifications (geofence alerts from FCM)
    const sub = Notifications.addNotificationReceivedListener((n) => {
      const body = n.request.content.body ?? '';
      showAlert(body);
    });

    return () => {
      socket.disconnect();
      sub.remove();
    };
  }, [myShift, myNode]);

  async function loadShift() {
    if (!user) return;
    try {
      const shifts = await api.getShifts();
      // Find the ACTIVE or OPTIMIZED shift where this user is assigned
      const active = shifts.find((s: any) =>
        ['ACTIVE', 'OPTIMIZED'].includes(s.status) &&
        s.staff?.some((ss: any) => ss.userId === user.userId),
      );
      if (!active) { setLoading(false); return; }
      setMyShift(active);

      // Find my pickup node
      const myStaffEntry = active.staff?.find((ss: any) => ss.userId === user.userId);
      const node = active.pickupNodes?.find((n: any) => n.id === myStaffEntry?.pickupNodeId);
      setMyNode(node ?? null);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }

  function showAlert(msg: string) {
    setAlertMsg(msg);
    Animated.sequence([
      Animated.timing(alertAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(8000),
      Animated.timing(alertAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setAlertMsg(null));
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Pickup</Text>
          <Text style={styles.headerSub}>{user?.email}</Text>
        </View>
        <TouchableOpacity onPress={logout}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      {/* Geofence alert banner */}
      {alertMsg && (
        <Animated.View style={[styles.alertBanner, { opacity: alertAnim }]}>
          <Text style={styles.alertIcon}>🚐</Text>
          <Text style={styles.alertText} numberOfLines={3}>{alertMsg}</Text>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        {!myShift ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No active shift</Text>
            <Text style={styles.emptyText}>
              You'll see your pickup details here once your manager optimizes a shift.
            </Text>
          </View>
        ) : (
          <>
            {/* Shift info card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>TODAY'S EVENT</Text>
              <Text style={styles.eventName}>{myShift.eventName}</Text>
              <Text style={styles.eventTime}>
                {new Date(myShift.startTime).toLocaleString([], {
                  weekday: 'long', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            </View>

            {/* Pickup node card */}
            {myNode ? (
              <View style={[styles.card, styles.nodeCard]}>
                <Text style={styles.cardLabel}>YOUR PICKUP POINT</Text>
                <Text style={styles.nodeAddress}>{myNode.address}</Text>
                <View style={styles.etaRow}>
                  <View style={styles.etaBlock}>
                    <Text style={styles.etaLabel}>ETA</Text>
                    <Text style={styles.etaValue}>
                      {new Date(myNode.estimatedAt).toLocaleTimeString([], {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  {distanceKm !== null && (
                    <View style={styles.etaBlock}>
                      <Text style={styles.etaLabel}>DISTANCE</Text>
                      <Text style={[styles.etaValue, distanceKm < 1 && styles.etaClose]}>
                        {distanceKm < 1
                          ? `${Math.round(distanceKm * 1000)} m`
                          : `${distanceKm.toFixed(1)} km`}
                      </Text>
                    </View>
                  )}
                  <View style={styles.etaBlock}>
                    <Text style={styles.etaLabel}>OTHERS</Text>
                    <Text style={styles.etaValue}>
                      {(myNode.staff?.length ?? 1) - 1} others
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.mapBtn}
                  onPress={() => router.push(`/map?shiftId=${myShift.id}&nodeId=${myNode.id}`)}
                >
                  <Text style={styles.mapBtnText}>Track vehicle on map →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardLabel}>YOUR PICKUP POINT</Text>
                <Text style={styles.emptyText}>
                  Your manager is still optimizing the route. You'll be notified once your pickup point is assigned.
                </Text>
              </View>
            )}

            {/* Vehicle status */}
            {vehiclePos ? (
              <View style={styles.vehicleStatus}>
                <View style={styles.liveDot} />
                <Text style={styles.vehicleStatusText}>Vehicle is live and moving</Text>
              </View>
            ) : (
              <View style={styles.vehicleStatus}>
                <View style={[styles.liveDot, { backgroundColor: '#d1d5db' }]} />
                <Text style={styles.vehicleStatusText}>Waiting for vehicle to start…</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Haversine distance in metres. */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#f9fafb' },
  header:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTitle:       { fontSize: 20, fontWeight: '700', color: '#111' },
  headerSub:         { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  logoutText:        { fontSize: 13, color: '#6b7280' },
  alertBanner:       { backgroundColor: '#fef9c3', borderLeftWidth: 4, borderLeftColor: '#f59e0b', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  alertIcon:         { fontSize: 20 },
  alertText:         { flex: 1, fontSize: 13, color: '#78350f', lineHeight: 18 },
  scroll:            { padding: 16, gap: 12 },
  card:              { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  nodeCard:          { borderColor: '#2563eb', borderWidth: 1.5 },
  cardLabel:         { fontSize: 10, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, marginBottom: 6 },
  eventName:         { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 4 },
  eventTime:         { fontSize: 13, color: '#6b7280' },
  nodeAddress:       { fontSize: 16, fontWeight: '600', color: '#111', marginBottom: 14, lineHeight: 22 },
  etaRow:            { flexDirection: 'row', gap: 12, marginBottom: 16 },
  etaBlock:          { flex: 1, backgroundColor: '#f9fafb', borderRadius: 10, padding: 10, alignItems: 'center' },
  etaLabel:          { fontSize: 10, fontWeight: '600', color: '#9ca3af', letterSpacing: 0.5, marginBottom: 4 },
  etaValue:          { fontSize: 18, fontWeight: '700', color: '#111' },
  etaClose:          { color: '#16a34a' },
  mapBtn:            { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  mapBtnText:        { color: '#fff', fontWeight: '600', fontSize: 14 },
  vehicleStatus:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  liveDot:           { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' },
  vehicleStatusText: { fontSize: 12, color: '#6b7280' },
  emptyCard:         { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  emptyTitle:        { fontSize: 17, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptyText:         { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },
});
