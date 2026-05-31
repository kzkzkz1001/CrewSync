import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, Callout, Circle } from 'react-native-maps';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { io } from 'socket.io-client';
import * as api from '../lib/api';
import { WS_EVENTS } from '@crewsync/types';
import type { GpsPayload } from '@crewsync/types';

const GATEWAY = Constants.expoConfig?.extra?.gatewayUrl ?? 'http://localhost:3000';
const GEOFENCE_RADIUS = 1000; // metres

export default function StaffMapScreen() {
  const { shiftId, nodeId } = useLocalSearchParams<{ shiftId: string; nodeId: string }>();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [node,       setNode]       = useState<any>(null);
  const [vehiclePos, setVehiclePos] = useState<{ lat: number; lng: number } | null>(null);
  const [inside,     setInside]     = useState(false);

  useEffect(() => {
    (async () => {
      const shift = await api.getShifts().then((all) => all.find((s: any) => s.id === shiftId));
      if (!shift) return;
      const n = shift.pickupNodes?.find((p: any) => p.id === nodeId);
      setNode(n ?? null);
    })();

    const socket = io(`${GATEWAY}/gps`);
    socket.on(WS_EVENTS.GPS_UPDATE, (payload: GpsPayload) => {
      setVehiclePos({ lat: payload.lat, lng: payload.lng });

      // Animate map camera to keep vehicle in view
      mapRef.current?.animateCamera(
        { center: { latitude: payload.lat, longitude: payload.lng }, zoom: 14 },
        { duration: 800 },
      );
    });

    return () => socket.disconnect();
  }, [shiftId, nodeId]);

  // Compute whether vehicle is inside the 1 km geofence
  useEffect(() => {
    if (!vehiclePos || !node) return;
    const d = haversine(vehiclePos.lat, vehiclePos.lng, node.lat, node.lng);
    setInside(d <= GEOFENCE_RADIUS);
  }, [vehiclePos, node]);

  if (!node) return (
    <View style={styles.center}>
      <Text style={styles.loadingText}>Loading map…</Text>
    </View>
  );

  const nodeCoord = { latitude: node.lat, longitude: node.lng };

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>

      {/* Geofence alert overlay */}
      {inside && (
        <View style={styles.geofenceOverlay}>
          <Text style={styles.geofenceText}>🚐 Truck is within 1 km — get ready!</Text>
        </View>
      )}

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude:       nodeCoord.latitude,
          longitude:      nodeCoord.longitude,
          latitudeDelta:  0.04,
          longitudeDelta: 0.04,
        }}
      >
        {/* 1 km geofence circle */}
        <Circle
          center={nodeCoord}
          radius={GEOFENCE_RADIUS}
          strokeColor="rgba(37,99,235,0.4)"
          fillColor="rgba(37,99,235,0.08)"
        />

        {/* Your pickup node marker */}
        <Marker coordinate={nodeCoord} pinColor="#2563eb">
          <Callout>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>Your Pickup Point</Text>
              <Text style={styles.calloutText}>{node.address}</Text>
            </View>
          </Callout>
        </Marker>

        {/* Live vehicle marker */}
        {vehiclePos && (
          <Marker
            coordinate={{ latitude: vehiclePos.lat, longitude: vehiclePos.lng }}
            title="Your truck"
          >
            <View style={styles.truckMarker}>
              <Text style={styles.truckEmoji}>🚐</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Bottom info strip */}
      <View style={styles.infoStrip}>
        <Text style={styles.infoAddress} numberOfLines={1}>{node.address}</Text>
        <Text style={styles.infoEta}>
          ETA: {new Date(node.estimatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {vehiclePos
            ? `  ·  ${(haversine(vehiclePos.lat, vehiclePos.lng, node.lat, node.lng) / 1000).toFixed(1)} km away`
            : '  ·  Waiting for truck…'
          }
        </Text>
      </View>
    </View>
  );
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  map:              { flex: 1 },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText:      { color: '#6b7280', fontSize: 14 },
  backBtn:          { position: 'absolute', top: 56, left: 16, zIndex: 10, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  backBtnText:      { fontSize: 14, fontWeight: '600', color: '#374151' },
  geofenceOverlay:  { position: 'absolute', top: 108, left: 16, right: 16, zIndex: 10, backgroundColor: '#fef3c7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
  geofenceText:     { fontSize: 14, fontWeight: '600', color: '#92400e' },
  callout:          { width: 180, padding: 4 },
  calloutTitle:     { fontWeight: '700', fontSize: 13, marginBottom: 4 },
  calloutText:      { fontSize: 12, color: '#374151' },
  truckMarker:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef9c3', borderWidth: 2, borderColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' },
  truckEmoji:       { fontSize: 18 },
  infoStrip:        { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  infoAddress:      { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 4 },
  infoEta:          { fontSize: 12, color: '#6b7280' },
});
