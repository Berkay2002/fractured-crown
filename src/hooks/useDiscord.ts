import { useEffect, useState, useCallback, useRef } from 'react';
import { DiscordSDK } from '@discord/embedded-app-sdk';

const DISCORD_CLIENT_ID = '1480188235148693635';

interface DiscordState {
  isDiscord: boolean;
  ready: boolean;
  setActivity: (activity: { details: string; state: string; instance: boolean }) => Promise<void>;
}

function isRunningInDiscord(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.has('frame_id') || window.self !== window.top;
  } catch {
    // cross-origin iframe check throws → likely in iframe
    return true;
  }
}

export function useDiscord(): DiscordState {
  const [ready, setReady] = useState(false);
  const sdkRef = useRef<DiscordSDK | null>(null);
  const [isDiscord] = useState(() => isRunningInDiscord());

  useEffect(() => {
    if (!isDiscord) return;

    let cancelled = false;

    const init = async () => {
      try {
        const sdk = new DiscordSDK(DISCORD_CLIENT_ID);
        sdkRef.current = sdk;

        await sdk.ready();

        // OAuth2 authorize
        const { code } = await sdk.commands.authorize({
          client_id: DISCORD_CLIENT_ID,
          response_type: 'code',
          state: '',
          prompt: 'none',
          scope: ['identify', 'rpc.activities.write'],
        });

        // Exchange code for token
        await sdk.commands.authenticate({ access_token: code });

        if (!cancelled) setReady(true);
      } catch (err) {
        console.warn('[Discord SDK] Init failed — running in web mode', err);
      }
    };

    init();
    return () => { cancelled = true; };
  }, [isDiscord]);

  const setActivity = useCallback(async (activity: { details: string; state: string; instance: boolean }) => {
    if (!sdkRef.current || !ready) return;
    try {
      await sdkRef.current.commands.setActivity({
        activity: {
          details: activity.details,
          state: activity.state,
          type: 0, // Playing
          timestamps: { start: Date.now() },
        },
      });
    } catch (err) {
      console.warn('[Discord SDK] setActivity failed', err);
    }
  }, [ready]);

  if (!isDiscord) {
    return { isDiscord: false, ready: false, setActivity: async () => {} };
  }

  return { isDiscord, ready, setActivity };
}
