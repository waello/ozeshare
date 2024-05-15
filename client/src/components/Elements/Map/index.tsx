import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GeolocationPosition } from '../../../types'

// Define custom CSS for the markers
const createCustomMarkerIcon = (color: string) => {
    return new L.Icon({
        iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
        <path fill="${color}" stroke="black" stroke-width="1" d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5 14.5 7.6 14.5 9 13.4 11.5 12 11.5z"/>
      </svg>
    `)}`,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
        popupAnchor: [0, -24],
        shadowUrl: 'https://unpkg.com/leaflet@1.6.0/dist/images/marker-shadow.png',
        shadowSize: [41, 41],
        shadowAnchor: [12, 41],
    });
};

interface MapProps {
    driverLocation: GeolocationPosition | null;
    userLocations?: { userId: string; position: GeolocationPosition }[];
}

const RecenterMap = ({ lat, lng }: { lat: number; lng: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lng]);
    }, [lat, lng]);
    return null;
};

const Map: React.FC<MapProps> = ({ driverLocation, userLocations = [] }) => {
    const defaultCenter = driverLocation ? [driverLocation.lat, driverLocation.lng] : [0, 0];
    const zoomLevel = driverLocation ? 13 : 2;

    const driverIcon = createCustomMarkerIcon('red');
    const userIcon = createCustomMarkerIcon('blue');

    return (
        <div className='w-full h-[600px] md:h-[550px]'>
            <MapContainer center={defaultCenter} zoom={zoomLevel} scrollWheelZoom={true} className='h-full'>
                <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />

                {driverLocation && (
                    <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
                        <Popup>Driver's Location</Popup>
                        <RecenterMap lat={driverLocation.lat} lng={driverLocation.lng} />
                    </Marker>
                )}

                {userLocations.map((user) => (
                    <Marker key={user.userId} position={[user.position.lat, user.position.lng]} icon={userIcon}>
                        <Popup>User: {user.userId}</Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default Map;
