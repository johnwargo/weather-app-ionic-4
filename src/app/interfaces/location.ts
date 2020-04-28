export enum LocationType { Geolocation, PostalCode }

export interface Coordinates {
  longitude: number;
  latitude: number;
}

export interface Postal {
  PostalCode: string;
}

export interface LocationConfig {
  type: LocationType;
  value: Coordinates | Postal;
}
