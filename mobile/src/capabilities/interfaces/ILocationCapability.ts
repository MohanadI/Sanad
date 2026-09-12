export interface LocationReadResult {
  approximateAreaArabic: string;
  timestamp: string;
}

export interface LocationShareParams {
  recipientContactId: string;
  recipientName: string;
}

export interface LocationShareResult {
  shared: boolean;
  timestamp: string;
}

export interface ILocationCapability {
  readCurrentLocation(): Promise<LocationReadResult>;
  shareLocation(params: LocationShareParams): Promise<LocationShareResult>;
}
