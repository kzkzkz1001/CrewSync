import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import type { Coordinates } from '@crewsync/types';

export interface MatrixResult {
  durations: number[][];  // seconds
  distances: number[][];  // metres
}

@Injectable()
export class MapboxService {
  private readonly apiKey = process.env.MAPBOX_API_KEY ?? '';
  private readonly matrixBase = 'https://api.mapbox.com/directions-matrix/v1/mapbox/driving-traffic';
  private readonly geocodeBase = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

  /**
   * Fetches an NxN duration + distance matrix for the given coordinates.
   * Mapbox cap: 25 coordinates per request.
   */
  async getMatrix(coordinates: Coordinates[]): Promise<MatrixResult> {
    if (coordinates.length > 25) {
      throw new InternalServerErrorException('Mapbox Matrix API supports max 25 coordinates');
    }
    const coords = coordinates.map((c) => `${c.lng},${c.lat}`).join(';');
    const url = `${this.matrixBase}/${coords}`;
    try {
      const { data } = await axios.get(url, {
        params: { access_token: this.apiKey, annotations: 'duration,distance' },
      });
      return {
        durations: data.durations as number[][],
        distances: data.distances as number[][],
      };
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : String(err);
      throw new InternalServerErrorException(`Mapbox Matrix API error: ${msg}`);
    }
  }

  /**
   * Reverse-geocodes a lat/lng pair to a human-readable address string.
   * Falls back to a coordinate string if the API call fails.
   */
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const url = `${this.geocodeBase}/${lng},${lat}.json`;
      const { data } = await axios.get(url, {
        params: { access_token: this.apiKey, types: 'address,poi', limit: 1 },
      });
      const feature = data.features?.[0];
      return feature?.place_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }
}
