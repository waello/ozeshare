import { useState, useEffect } from 'react';
import { useSocket } from '../context/socket';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import StatusPanel from '../components/Elements/StatusPanel';
import Status from '../components/Elements/Status';
import Map from '../components/Elements/Map';
import { GeolocationPosition, SocketStatus, LocationStatus } from '../types';
import { LuCopy } from 'react-icons/lu';
import { useLocation } from 'react-router-dom';

type RoomInfo = {
  roomId: string;
  position: GeolocationPosition;
  totalConnectedUsers: string[];
};

type UserLocation = {
  userId: string;
  position: GeolocationPosition;
};

export default function Home() {
  const { socket, connectSocket } = useSocket();
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('disconnected');
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('unknown');
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [roomLink, setRoomLink] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [userLocations, setUserLocations] = useState<UserLocation[]>([]);

  const { search } = useLocation();

  function connectToSocketServer() {
    connectSocket();
    setSocketStatus('connecting');
  }

  useEffect(() => {
    let watchId: number | null = null;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
          (position) => {
            setPosition({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            setLocationStatus('accessed');
          },
          (error) => {
            switch (error.code) {
              case error.PERMISSION_DENIED:
                setLocationStatus('denied');
                break;
              case error.POSITION_UNAVAILABLE:
                setLocationStatus('unknown');
                break;
              case error.TIMEOUT:
                setLocationStatus('error');
                break;
              default:
                setLocationStatus('error');
                break;
            }
          }
      );
    }
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const roomCodeFromUrl = params.get('code');
    if (roomCodeFromUrl) {
      setRoomCode(roomCodeFromUrl);
    }
  }, [search]);

  useEffect(() => {
    if (socket) {
      socket.on('connect', () => {
        setSocketStatus('connected');

        if (!roomCode) {
          toast.error('Please enter a room code', {
            autoClose: 2000,
          });
          return;
        } else {
          setRoomCode(roomCode);
          socket.emit('createRoom', {
            roomCode,
            position,
          });
        }
      });

      socket.on('roomCreated', (data: RoomInfo) => {
        toast.success('You are live!', {
          autoClose: 2000,
        });
        setRoomInfo(data);
      });

      socket.on('userJoinedRoom', (data: { userId: string; totalConnectedUsers: string[] }) => {
        setRoomInfo((prev) => {
          if (prev) {
            return {
              ...prev,
              totalConnectedUsers: data.totalConnectedUsers,
            };
          }
          return null;
        });

        toast.info(`${data.userId} joined the room`, {
          autoClose: 2000,
        });

        position &&
        socket.emit('updateLocation', {
          position,
        });
      });

      socket.on('userLeftRoom', (data: { userId: string; totalConnectedUsers: string[] }) => {
        setRoomInfo((prev) => {
          if (prev) {
            return {
              ...prev,
              totalConnectedUsers: data.totalConnectedUsers,
            };
          }
          return null;
        });

        toast.info(`${data.userId} left the room`, {
          autoClose: 2000,
        });

        setUserLocations((prevLocations) =>
            prevLocations.filter((location) => location.userId !== data.userId)
        );
      });

      socket.on('updateLocationResponse', (data: { userId: string; position: GeolocationPosition }) => {
        setUserLocations((prevLocations) => {
          const existingIndex = prevLocations.findIndex((loc) => loc.userId === data.userId);
          if (existingIndex !== -1) {
            const updatedLocations = [...prevLocations];
            updatedLocations[existingIndex] = { userId: data.userId, position: data.position };
            return updatedLocations;
          } else {
            return [...prevLocations, { userId: data.userId, position: data.position }];
          }
        });
      });

      socket.on('disconnect', () => {
        setSocketStatus('disconnected');
      });

      return () => {
        socket.off('connect');
        socket.off('roomCreated');
        socket.off('userJoinedRoom');
        socket.off('userLeftRoom');
        socket.off('updateLocationResponse');
        socket.off('disconnect');
      };
    }
  }, [socket, roomCode, position]);

  useEffect(() => {
    if (socket) {
      const pingInterval = setInterval(() => {
        socket.emit('ping');
      }, 30000);

      return () => clearInterval(pingInterval);
    }
  }, [socket]);

  useEffect(() => {
    if (socket && position) {
      socket.emit('updateLocation', {
        position,
      });
    }
  }, [socket, position]);

  function stopSharingLocation() {
    if (socket) {
      socket.disconnect();
      setSocketStatus('disconnected');
      setRoomInfo(null);
      toast.success('You are no longer live!', {
        autoClose: 2000,
      });
    }
  }

  return (
      <>
        <section className='pb-3'>
          <article className='bg-slate-600 rounded-md p-3 flex flex-wrap gap-3 justify-between items-center w-full'>
            <Status locationStatus={locationStatus} socketStatus={socketStatus} />
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
        <section className='flex flex-col lg:flex-row gap-4 w-full h-auto'>
          <article
              className={`flex flex-col justify-between gap-4 w-full bg-slate-500 px-4 py-6 rounded-xl lg:min-w-[20rem] ${
                  position ? 'lg:max-w-sm' : 'w-full'
              }`}
          >
            <div className='flex flex-col gap-3 w-full'>
              {socketStatus === 'disconnected' && (
                  <div className='flex flex-col gap-6 items-start w-full'>
                    <button
                        className={`${
                            locationStatus === 'accessed' ? 'bg-purple-800' : 'bg-gray-600 cursor-not-allowed'
                        } text-md text-white font-bold py-2 px-4 rounded-md`}
                        onClick={() => {
                          if (locationStatus === 'accessed' && roomCode) {
                            connectToSocketServer();
                          } else {
                            if (locationStatus !== 'accessed') {
                              toast.error('Please allow location access', {
                                autoClose: 2000,
                              });
                            } else if (!roomCode) {
                              toast.error('Please enter a valid phone number', {
                                autoClose: 2000,
                              });
                            }
                          }
                        }}
                        disabled={locationStatus !== 'accessed'}
                    >
                      Share Location
                    </button>

                    <span className='flex gap-1'>
                  <input
                      type='text'
                      value={roomLink}
                      onChange={(e) => setRoomLink(e.target.value)}
                      placeholder='Enter a link'
                      className='bg-gray-300 rounded-md px-4 py-2 outline-none ring-0 text-md font-medium'
                  />
                  <button
                      className='bg-yellow-400 text-md text-gray-700 font-bold py-2 px-4 rounded-md'
                      onClick={() => {
                        if (roomLink) {
                          window.open(roomLink, '_self');
                        } else {
                          toast.error('Please enter a link', {
                            autoClose: 1000,
                          });
                        }
                      }}
                  >
                    Join
                  </button>
                </span>
                  </div>
              )}
              {socketStatus === 'connected' && roomInfo && (
                  <>
                    <div className='flex gap-2 items-center justify-between bg-gray-300 rounded-md p-3'>
                      <p className='text-md font-bold break-all peer'>{`${import.meta.env.VITE_APP_URL}location/${roomCode}`}</p>
                      <span
                          className='cursor-pointer p-2 rounded-full hover:bg-gray-200 flex items-center active:animate-ping'
                          onClick={() => {
                            const url = `${import.meta.env.VITE_APP_URL}location/${roomCode}`;
                            navigator.clipboard
                                .writeText(url)
                                .then(() => {
                                  toast.info('Copied to clipboard!', {
                                    autoClose: 1000,
                                  });
                                })
                                .catch(() => {
                                  toast.error('Failed to copy to clipboard', {
                                    autoClose: 2000,
                                  });
                                });
                          }}
                      >
                    <LuCopy size={16} />
                  </span>
                    </div>

                    <div className='flex p-2 bg-yellow-400 rounded-md'>
                  <span className='flex gap-1 items-center'>
                    <p className='text-lg font-semibold text-blue-600'>
                      {roomInfo && roomInfo.totalConnectedUsers.length - 1}
                    </p>
                    <p className='text-md font-semibold'>connected users!</p>
                  </span>
                    </div>
                  </>
              )}
              {socketStatus === 'connecting' && (
                  <article className='mt-5'>
                    <StatusPanel title='Connecting to server' subtitle='Please wait...' status='loading' />
                  </article>
              )}
            </div>
            {socketStatus === 'connected' && roomInfo && (
                <div className='w-full flex justify-center'>
                  <div>
                    <button className='bg-red-600 text-xl text-white font-bold py-2 px-6 rounded-full' onClick={stopSharingLocation}>
                      Stop Sharing
                    </button>
                  </div>
                </div>
            )}
          </article>
          <article className='bg-gray-200 rounded-md overflow-hidden w-full'>
            {position && <Map driverLocation={position} userLocations={userLocations} />}
          </article>
        </section>
      </>
  );
}
