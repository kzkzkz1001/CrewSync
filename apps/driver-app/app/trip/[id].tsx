import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import * as api from '../../lib/api';

export default function TripMapScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [shift,       setShift]       = useState<any>(null);
  const [driverCoord, setDriverCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      const [s] = await Promise.all([
        api.getShift(id),
        Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 5000 },
          (loc) => setDriverCoord({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }),
        ),
      ]);
      setShift(s);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!shift)  return <View style={styles.center}><Text>Shift not found.</Text></View>;

  const dest = { latitude: shift.destLat, longitude: shift.destLng };
  const nodes: any[] = shift.pickupNodes ?? [];

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude:       dest.latitude,
          longitude:      dest.longitude,
          latitudeDelta:  0.08,
          longitudeDelta: 0.08,
        }}
        showsUserLocation
      >
        {/* Destination */}
        <Marker coordinate={dest} pinColor="red" title="Destination" description={shift.eventName} />

        {/* Pickup nodes */}
        {nodes.map((node, i) => (
          <Marker
            key={node.id}
            coordinate={{ latitude: node.lat, longitude: node.lng }}
            pinColor="#2563eb"
          >
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>Stop {i + 1}</Text>
                <Text style={styles.calloutText}>{node.address}</Text>
                <Text style={styles.calloutText}>
                  ETA: {new Date(node.estimatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.calloutText}>
                  {(node.staff?.length ?? 0)} staff waiting
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Bottom node list */}
      <View style={styles.nodeList}>
        <Text style={styles.nodeListTitle}>Route — {nodes.length} stops</Text>
        {nodes.map((node, i) => (
          <View key={node.id} style={styles.nodeRow}>
            <View style={styles.nodeBadge}>
              <Text style={styles.nodeBadgeText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nodeAddress} numberOfLines={1}>{node.address}</Text>
              <Text style={styles.nodeMeta}>
                ETA {new Date(node.estimatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                {node.staff?.length ?? 0} staff
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  map:            { flex: 1 },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  callout:        { width: 180, padding: 4 },
  calloutTitle:   { fontWeight: '700', fontSize: 14, marginBottom: 4 },
  calloutText:    { fontSize: 12, color: '#374151' },
  nodeList:       { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', maxHeight: 220 },
  nodeListTitle:  { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 10 },
  nodeRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  nodeBadge:      { width: 26, height: 26, borderRadius: 13, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  nodeBadgeText:  { color: '#fff', fontWeight: '700', fontSize: 12 },
  nodeAddress:    { fontSize: 13, fontWeight: '500', color: '#111' },
  nodeMeta:       { fontSize: 11, color: '#9ca3af', marginTop: 1 },
});
