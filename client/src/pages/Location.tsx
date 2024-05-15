import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../context/socket';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Status from '../components/Elements/Status';
import Map from '../components/Elements/Map';
import StatusPanel from '../components/Elements/StatusPanel';
import { SocketStatus, GeolocationPosition } from '../types';
import { BsFillArrowLeftCircleFill } from 'react-icons/bs';

type RoomStatus = 'unknown' | 'joined' | 'not-exist';

function Location() {
  const { roomId } = useParams();
  const { socket, connectSocket, disconnectSocket } = useSocket();
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');
  const [roomStatus, setRoomStatus] = useState<RoomStatus>('unknown');
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [sharingLocation, setSharingLocation] = useState<boolean>(false);
  const [intentionalDisconnect, setIntentionalDisconnect] = useState<boolean>(false);
  const [driverLocation, setDriverLocation] = useState<GeolocationPosition | null>(null);

  useEffect(() => {
    connectSocket();
    setSocketStatus('connecting');
    return () => {
      setIntentionalDisconnect(true);
      if (socket) {
        disconnectSocket();
        setSocketStatus('disconnected');
      }
    };
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('connect', () => {
        setSocketStatus('connected');
        socket.emit('joinRoom', { roomId });
      });

      socket.on('roomJoined', ({ status, position }: { status: string; position: GeolocationPosition }) => {
        if (status === 'OK') {
          setRoomStatus('joined');
          setDriverLocation(position);
        } else if (status === 'ERROR') {
          setRoomStatus('not-exist');
        } else {
          setRoomStatus('unknown');
        }
      });

      socket.on('updateLocationResponse', ({ userId, position }: { userId: string; position: GeolocationPosition }) => {
        setDriverLocation(position);
      });

      socket.on('roomDestroyed', () => {
        setRoomStatus('not-exist');
        setIntentionalDisconnect(true);
        disconnectSocket();
      });

      socket.on('disconnect', () => {
        setSocketStatus('disconnected');
        if (!intentionalDisconnect) {
          setTimeout(() => {
            if (socket) {
              socket.connect();
            }
          }, 1000);
        }
      });

      return () => {
        socket.off('connect');
        socket.off('roomJoined');
        socket.off('updateLocationResponse');
        socket.off('roomDestroyed');
        socket.off('disconnect');
      };
    }
  }, [socket, roomId, intentionalDisconnect]);

  useEffect(() => {
    if (sharingLocation && 'geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const newPosition = { lat: latitude+Math.floor(Math.random() * (1000 - 100) + 100) / 100, lng: longitude+Math.floor(Math.random() * (1000 - 100) + 100) / 100 };
            setPosition(newPosition);
            if (socket) {
              socket.emit('updateLocation', { userId: socket.id, position: newPosition });
            }
          },
          (error) => {
            console.error('Error getting location:', error);
            toast.error('Error getting location');
          },
          { enableHighAccuracy: true }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [sharingLocation, socket]);

  function startSharingLocation() {
    setSharingLocation(true);
    toast.success('Started sharing your location', { autoClose: 2000 });
  }

  function stopSharingLocation() {
    setSharingLocation(false);
    setIntentionalDisconnect(true);
    disconnectSocket();
    setSocketStatus('disconnected');
    toast.success('You are no longer sharing your location', { autoClose: 2000 });
  }

  return (
      <>
        <section className='pb-3'>
          <article className='bg-slate-600 rounded-md p-3 flex flex-wrap gap-3 justify-between items-center w-full'>
            <Status locationStatus={null} socketStatus={socketStatus} />
            {position && (
                <div className='flex gap-2 justify-end text-gray-200'>
                  <p className='font-bold text-sm'>
                    Lat: <span className='text-lg font-bold'>{position.lat} | </span>
                  </p>
                  <p className='font-bold text-sm'>
                    Lng: <span className='text-lg font-bold'>{position.lng}</span>
                  </p>
                </div>
            )}
          </article>
        </section>
        {roomStatus === 'joined' && (
            <section>
              <div className='bg-gray-200 rounded-md overflow-hidden'>
                <Map driverLocation={driverLocation} />
              </div>
            </section>
        )}
        <section className='pb-3'>
          {socketStatus === 'connecting' && (
              <article className='mt-5'>
                <StatusPanel title="Connecting to server" subtitle="Please wait..." status="loading" />
              </article>
          )}
          {socketStatus === 'error' && (
              <article className='mt-5'>
                <StatusPanel title="Failed to connect to server" subtitle="Please try again later" status="error" />
              </article>
          )}
          {socketStatus !== 'connecting' && roomStatus === 'unknown' && (
              <article className='mt-5'>
                <StatusPanel title="Room is unknown" subtitle="Please try again later" status="error" />
              </article>
          )}
          {roomStatus === 'not-exist' && (
              <article className='mt-5'>
                <StatusPanel title="Room does not exist" subtitle="Check the URL and try again" status="error" />
              </article>
          )}
          {roomStatus === 'joined' && (
              <article className='mt-5 flex flex-col items-start'>
                <button
                    className={`${
                        sharingLocation ? 'bg-red-600' : 'bg-green-600'
                    } text-md text-white font-bold py-2 px-4 rounded-md`}
                    onClick={sharingLocation ? stopSharingLocation : startSharingLocation}
                >
                  {sharingLocation ? 'Stop Sharing Location' : 'Share Your Location'}
                </button>
              </article>
          )}
          {roomStatus !== 'joined' && (
              <article className='text-white flex items-center gap-2'>
                <BsFillArrowLeftCircleFill size={20} className='cursor-pointer' onClick={() => window.open('/', '_self')} />
                <p className='text-md font-semibold'>Back</p>
              </article>
          )}
        </section>
      </>
  );
}

export default Location;
