import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Form,
  Input,
  Radio,
  Link,
  Space,
  FormProps,
  Message,
  Typography,
} from '@arco-design/web-react';
import api, { TransformMethod } from './api';
import {
  RTC_CONFIGURATION,
  WS_URL,
  formatMessage,
  parseMessage,
} from './common';
import './styles.css';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [form] = Form.useForm();
  const transformMethod = Form.useWatch('transformMethod', form);

  const [webSocket, setWebSocket] = useState<WebSocket>();
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection>();
  const [peerId] = useState(Math.random().toString().slice(2, 6));

  const [localStream, setLocalStream] = useState<MediaStream>();
  const [loading, setLoading] = useState(false);

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    const pc = new RTCPeerConnection(RTC_CONFIGURATION);

    pc.ontrack = function (e) {
      if (!remoteVideoRef.current) return;

      remoteVideoRef.current.srcObject = e.streams[0];
    };

    pc.onicecandidate = (e) => {
      if (!e.candidate || !connected) return;
      ws.send(
        formatMessage('ON_ICE_CANDIDATE', {
          candidate: e.candidate,
        }),
      );
    };

    pc.onnegotiationneeded = async () => {
      console.log('onnegotiationneeded');
    };

    ws.onopen = async () => {
      ws.send(formatMessage('CONNECT', { peerId }));
    };

    ws.onerror = () => {
      Message.error('WebSocket 连接失败');
    };

    ws.onmessage = async (e) => {
      const { type, data } = parseMessage(e.data);
      console.log(type, data);
      switch (type) {
        case 'SESSION_OK': {
          setConnected(true);
          break;
        }

        case 'SESSION_END': {
          setConnected(false);
          break;
        }
        case 'OFFER_SDP': {
          const offer = new RTCSessionDescription({
            type: 'offer',
            sdp: data.sdp as string,
          });
          await pc.setRemoteDescription(offer);
          const answer = await pc.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(answer);

          ws.send(formatMessage('ANSWER_SDP', { sdp: answer.sdp }));
          break;
        }

        case 'ON_ICE_CANDIDATE': {
          const candidate = new RTCIceCandidate(
            data.candidate as RTCIceCandidateInit,
          );
          console.log(candidate);
          pc.addIceCandidate(candidate);
          break;
        }
      }
    };

    setWebSocket(ws);
    setPeerConnection(pc);
    return () => {
      pc.close();
      ws.close();
    };
  }, []);

  const handleConnect = async (targetId: number) => {
    webSocket?.send(formatMessage('SESSION', { targetId }));
  };

  const handleSubmit: FormProps['onSubmit'] = async (values) => {
    if (!localStream) {
      return Message.error('请先获取本地视频流');
    }

    setLoading(true);
    api
      .createSession({
        rtspUrl: values.rtspUrl,
        method: values.transformMethod,
      })
      .then((peerId) => handleConnect(peerId))
      .finally(() => setLoading(false));
  };

  const handleAddLocalTrack = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: 480,
        height: 320,
        facingMode: 'environment',
      },
      audio: false,
    });
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;

    peerConnection?.addTrack(stream.getTracks()[0]);
    setLocalStream(stream);
  };

  const handleStopLocalTrack = () => {
    if (videoRef?.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setLocalStream(undefined);
    }
  };

  return (
    <section className="h-100vh flex flex-col">
      <header className="flex align-middle justify-start p-18px border-b-1px">
        <div className="text-18px font-semibold">
          房间号：<Typography.Text copyable>{peerId}</Typography.Text>
        </div>
      </header>
      <main className="flex-1 p-24px flex justify-between">
        <section className="video-player">
          <video className="local" ref={videoRef} autoPlay playsInline muted />
          <video
            className="remote"
            ref={remoteVideoRef}
            autoPlay
            playsInline
            muted
          />
        </section>
        <aside className="flex flex-col flex-1">
          <Form
            className="w-500px"
            form={form}
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
            onSubmit={handleSubmit}
          >
            <Form.Item
              required
              field="transformMethod"
              label="转换方式"
              initialValue={TransformMethod.RTSP_TO_WEB_RTC}
            >
              <Radio.Group>
                <Radio value={TransformMethod.RTSP_TO_WEB_RTC}>
                  RTSP 转 WebRTC
                </Radio>
                <Radio value={TransformMethod.WEB_RTC_TO_RTSP}>
                  WebRTC 转 RTSP
                </Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item
              required
              rules={[
                { required: true, message: '请输入 RTSP 地址' },
                {
                  match: /^rtsp:\/\//,
                  message: '请输入正确的 RTSP 地址',
                },
              ]}
              field="rtspUrl"
              label={
                transformMethod === TransformMethod.RTSP_TO_WEB_RTC
                  ? 'RTSP 拉流地址'
                  : 'RTSP 推流地址'
              }
            >
              <Input />
            </Form.Item>

            <Form.Item required label="获取本地视频流">
              <Space>
                <Link onClick={handleAddLocalTrack}>
                  {localStream ? '重新获取' : '点击获取'}
                </Link>
                {localStream && (
                  <Link status="error" onClick={handleStopLocalTrack}>
                    停止获取
                  </Link>
                )}
              </Space>
            </Form.Item>
            <Form.Item wrapperCol={{ offset: 8 }}>
              <Button htmlType="submit" type="primary" loading={loading}>
                {transformMethod === TransformMethod.RTSP_TO_WEB_RTC
                  ? '开始拉流'
                  : '开始推流'}
              </Button>
            </Form.Item>
          </Form>
        </aside>
      </main>
    </section>
  );
}

export default App;
