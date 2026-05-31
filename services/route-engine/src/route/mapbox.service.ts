import { Injectable } from '@nestjs/common';
import axios from 'axios';
import type { Coordinates } from '@crewsync/types';

@Injectable()
export class MapboxService {
  private readonly apiKey = process.env.MAPBOX_API_KEY ?? '';
  private readonly baseUrl = 'https://api.mapbox.com/directions-matrix/v1/mapbox/driving';

  /**
   * Fetches a duration/distance matrix from Mapbox for the given coordinates.
   * Coordinates order: [driver_origin, ...staff_locations, destination]
   */
  async getMatrix(coordinates: Coordinates[]): Promise<number[][]> {
    const coords = coordinates.map((c) => `${c.lng},${c.lat}`).join(';');
    const url = `${this.baseUrl}/${coords}?access_token=${this.apiKey}&annotations=duration,distance`;
    const { data } = await axios.get(url);
    return data.durations as number[][];
  }
}
