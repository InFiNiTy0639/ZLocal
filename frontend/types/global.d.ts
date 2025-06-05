// Declare global types for the Google Maps JavaScript API.
declare global {
    interface Window {
        google: {
            maps: {
                Map: new (mapDiv: Element, opts?: any) => any
                LatLng: new (lat: number, lng: number) => any
                LatLngBounds: new () => any
                Marker: new (opts?: any) => any
                Polyline: new (opts?: any) => any
                Size: new (width: number, height: number) => any
                Geocoder: new () => any
                places: {
                    Autocomplete: new (inputField: HTMLInputElement, opts?: any) => any
                }
                geometry: {
                    encoding: {
                        decodePath: (encodedPath: string) => any[]
                    }
                }
                event: {
                    addListener: (instance: any, eventName: string, handler: () => void) => any
                    removeListener: (listener: any) => void
                    clearInstanceListeners: (instance: any) => void
                }
            }
        }
        gm_authFailure?: () => void
    }
}
export { }