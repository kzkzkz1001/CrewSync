import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { io } from 'socket.io-client';
import { WS_EVENTS } from '@crewsync/types';
import type { GpsPayload } from '@crewsync/types';

const GATEWAY_URL = process.env.EXPO_PUBLIC_GATEWAY_URL ?? 'http://localhost:3000';

export default function StaffScreen() {
  const vehiclePosition = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const socket = io(`${GATEWAY_URL}/gps`);

    socket.on(WS_EVENTS.GPS_UPDATE, (payload: GpsPayload) => {
      vehiclePosition.current = { lat: payload.lat, lng: payload.lng };
      // TODO: update map marker with new vehicle position
    });

    return () => { socket.disconnect(); };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CrewSync Staff</Text>
      <Text>Your pickup details will appear here once your shift is optimized.</Text>
      {/* TODO: show pickup node map + ETA */}
      {/* TODO: show geofence alert banner when truck is nearby */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: 'bold' },
});
