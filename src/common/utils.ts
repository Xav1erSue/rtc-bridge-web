export type MessageType =
  | 'CONNECT'
  | 'CONNECT_OK'
  | 'SESSION'
  | 'SESSION_OK'
  | 'SESSION_END'
  | 'SESSION_ERROR'
  | 'OFFER_SDP'
  | 'ANSWER_SDP'
  | 'ON_ICE_CANDIDATE';

export const formatMessage = (type: MessageType, data: object) => {
  return JSON.stringify({ type, data });
};

export const parseMessage = (message: string) => {
  return JSON.parse(message) as {
    type: MessageType;
    data: Record<string, unknown>;
  };
};
