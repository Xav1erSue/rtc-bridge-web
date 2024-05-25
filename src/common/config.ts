export const WS_URL = 'wss://signalling.xav1er.com';

export const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:106.54.7.149:3478' },
    {
      urls: 'turn:106.54.7.149:3478',
      username: 'xav1er',
      credential: '123456',
    },
  ],
};
