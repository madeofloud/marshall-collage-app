import React from 'react';
import { Composition } from 'remotion';
import { Collage } from './Collage';
import {
  ALL_FORMATS,
  ALL_SIZES,
  getCompositionId,
  getFormatDimensions,
  getSeamlessLoopFrames,
  type CollageProps,
} from './types';

const FPS = 25;

const defaultCollageProps: CollageProps = {
  images: [],
  background: '#121212',
  rotationSpeed: 60,
  grainAmount: 0.8,
  panelOverrides: {},
};

export const RemotionRoot: React.FC = () => (
  <>
    {ALL_FORMATS.flatMap((format) =>
      ALL_SIZES.map((size) => {
        const { width, height } = getFormatDimensions(format, size);
        const id = getCompositionId(format, size);
        return (
          <Composition
            key={id}
            id={id}
            component={Collage}
            durationInFrames={getSeamlessLoopFrames(
              defaultCollageProps.rotationSpeed,
              FPS
            )}
            fps={FPS}
            width={width}
            height={height}
            defaultProps={defaultCollageProps}
            calculateMetadata={({ props }) => ({
              durationInFrames: getSeamlessLoopFrames(props.rotationSpeed, FPS),
              props,
            })}
          />
        );
      })
    )}
  </>
);
