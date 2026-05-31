import { useEffect, useRef } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import { WS_EVENTS } from '@crewsync/types';

const GATEWAY_URL = process.env.EXPO_PUBLIC_GATEWAY_URL ?? 'http://localhost:3000';

export default function DriverScreen() {
  const socketRef = useRef<Socket | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTrip = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    const socket = io(`${GATEWAY_URL}/gps`);
    socketRef.current = socket;

    intervalRef.current = setInterval(async () => {
      const loc = await Location.getCurrentPositionAsync({});
      socket.emit(WS_EVENTS.GPS_UPDATE, {
        vehicleId: 'VEHICLE_ID_PLACEHOLDER', // TODO: get from auth context
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        timestamp: new Date().toISOString(),
      });
    }, 10_000);
  };

  const stopTrip = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    socketRef.current?.disconnect();
  };

  useEffect(() => () => stopTrip(), []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CrewSync Driver</Text>
      <Button title="Start Trip" onPress={startTrip} />
      <Button title="Stop Trip" onPress={stopTrip} color="red" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { fontSize: 24, fontWeight: 'bold' },
});
