'use client';

import { useEffect, useRef, useState } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { connectSocket, disconnectSocket, onGpsUpdate } from '@/lib/socket';
import type { GpsPayload, PickupNode } from '@crewsync/types';

interface Props {
  destination: { lat: number; lng: number };
  pickupNodes: PickupNode[];
  vehicleId?: string;
}

export default function LiveMap({ destination, pickupNodes, vehicleId }: Props) {
  const [vehiclePos, setVehiclePos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedNode, setSelectedNode] = useState<PickupNode | null>(null);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

  useEffect(() => {
    connectSocket();
    const off = onGpsUpdate((payload: GpsPayload) => {
      if (!vehicleId || payload.vehicleId === vehicleId) {
        setVehiclePos({ lat: payload.lat, lng: payload.lng });
      }
    });
    return () => {
      off();
      disconnectSocket();
    };
  }, [vehicleId]);

  return (
    <Map
      initialViewState={{ latitude: destination.lat, longitude: destination.lng, zoom: 11 }}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      mapboxAccessToken={mapboxToken}
    >
      <NavigationControl position="top-right" />

      {/* Event destination marker */}
      <Marker latitude={destination.lat} longitude={destination.lng} anchor="bottom">
        <div className="flex flex-col items-center">
          <div className="w-5 h-5 bg-red-500 rounded-full border-2 border-white shadow-md" title="Destination" />
          <span className="text-[10px] font-bold text-red-600 mt-0.5 bg-white px-1 rounded shadow">DEST</span>
        </div>
      </Marker>

      {/* Pickup node markers */}
      {pickupNodes.map((node, i) => (
        <Marker
          key={node.id}
          latitude={node.location.lat}
          longitude={node.location.lng}
          anchor="bottom"
          onClick={(e) => { e.originalEvent.stopPropagation(); setSelectedNode(node); }}
        >
          <div className="flex flex-col items-center cursor-pointer">
            <div className="w-6 h-6 bg-brand rounded-full border-2 border-white shadow-md flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">{i + 1}</span>
            </div>
          </div>
        </Marker>
      ))}

      {/* Pickup node popup */}
      {selectedNode && (
        <Popup
          latitude={selectedNode.location.lat}
          longitude={selectedNode.location.lng}
          onClose={() => setSelectedNode(null)}
          anchor="top"
          closeButton
        >
          <div className="text-xs space-y-1 max-w-[200px]">
            <p className="font-semibold text-gray-800">{selectedNode.address}</p>
            <p className="text-gray-500">
              ETA: {new Date(selectedNode.estimatedArrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-gray-500">
              {selectedNode.assignedStaffIds.length} staff assigned
            </p>
          </div>
        </Popup>
      )}

      {/* Live vehicle marker */}
      {vehiclePos && (
        <Marker latitude={vehiclePos.lat} longitude={vehiclePos.lng} anchor="center">
          <div
            className="w-8 h-8 bg-yellow-400 border-2 border-white rounded-full shadow-lg flex items-center justify-center"
            title="Vehicle"
          >
            🚐
          </div>
        </Marker>
      )}
    </Map>
  );
}
