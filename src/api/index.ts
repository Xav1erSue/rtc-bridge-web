import { request } from './request';

export enum TransformMethod {
  RTSP_TO_WEB_RTC,
  WEB_RTC_TO_RTSP,
}

export interface CreateSessionParams {
  method: TransformMethod;
  rtspUrl: string;
}

export default {
  createSession(params: CreateSessionParams): Promise<number> {
    return request.post('/createSession', params);
  },
};
