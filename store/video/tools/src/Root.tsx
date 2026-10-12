import React from 'react';
import { Composition } from 'remotion';
import { AppStorePreview, AppStoreProps } from './AppStorePreview';
import { Launch, LaunchProps } from './Launch';
import timeline from './timeline.json';

const launch = timeline.launch.duration;

export const RemotionRoot: React.FC = () => (
  <>
    {(['es', 'en'] as const).map((lang) => {
      const id = lang.toUpperCase();
      return (
        <React.Fragment key={lang}>
          <Composition
            id={`Launch-${id}`} component={Launch} durationInFrames={launch} fps={30} width={1920} height={1080}
            defaultProps={{ lang, platform: 'ios', variant: 'launch' } satisfies LaunchProps}
          />
          <Composition
            id={`LaunchVertical-${id}`} component={Launch} durationInFrames={launch} fps={30} width={1080} height={1920}
            defaultProps={{ lang, platform: 'ios', variant: 'launch' } satisfies LaunchProps}
          />
          <Composition
            id={`AppStorePreview-${id}`} component={AppStorePreview} durationInFrames={timeline.appStore.duration} fps={30}
            width={886} height={1920} defaultProps={{ lang } satisfies AppStoreProps}
          />
          <Composition
            id={`PlayPromo-${id}`} component={Launch} durationInFrames={launch} fps={30} width={1920} height={1080}
            defaultProps={{ lang, platform: 'android', variant: 'play' } satisfies LaunchProps}
          />
        </React.Fragment>
      );
    })}
  </>
);
