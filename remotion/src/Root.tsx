import React from 'react';
import { Composition } from 'remotion';
import { Collage } from './Collage';
import { StopMotion } from './StopMotion';
import { FeedbackLoop, defaultFeedbackProps, FEEDBACK_FPS } from './FeedbackLoop';
import {
  ALL_FORMATS,
  ALL_SIZES,
  getCompositionId,
  getFormatDimensions,
  getSeamlessLoopFrames,
  type CollageProps,
} from './types';
import {
  STOP_MOTION_FPS,
  getStopMotionDuration,
  type StopMotionProps,
} from './stopMotionTypes';

const FPS = 25;

const defaultCollageProps: CollageProps = {
  images: [],
  background: '#121212',
  rotationSpeed: 60,
  grainAmount: 0.8,
  panelOverrides: {},
};

const defaultStopMotionProps: StopMotionProps = {
  images: [],
  alignments: {},
  framesPerImage: 12,
  transition: 'cut',
  targetSize: 0.18,
  background: '#121212',
  showCenter: false,
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
            durationInFrames={getSeamlessLoopFrames(defaultCollageProps.rotationSpeed, FPS)}
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
    {ALL_FORMATS.flatMap((format) =>
      ALL_SIZES.map((size) => {
        const { width, height } = getFormatDimensions(format, size);
        const id = `StopMotion-${format}-${size}`;
        return (
          <Composition
            key={id}
            id={id}
            component={StopMotion}
            durationInFrames={getStopMotionDuration(5, defaultStopMotionProps.framesPerImage)}
            fps={STOP_MOTION_FPS}
            width={width}
            height={height}
            defaultProps={defaultStopMotionProps}
            calculateMetadata={({ props }) => ({
              durationInFrames: getStopMotionDuration(
                Math.max(1, props.images.length),
                props.framesPerImage
              ),
              props,
            })}
          />
        );
      })
    )}
    {ALL_FORMATS.flatMap((format) =>
      ALL_SIZES.map((size) => {
        const { width, height } = getFormatDimensions(format, size);
        const id = `FeedbackLoop-${format}-${size}`;
        return (
          <Composition
            key={id}
            id={id}
            component={FeedbackLoop}
            durationInFrames={Math.round(defaultFeedbackProps.durationSeconds * FEEDBACK_FPS)}
            fps={FEEDBACK_FPS}
            width={width}
            height={height}
            defaultProps={defaultFeedbackProps}
            calculateMetadata={({ props }) => ({
              durationInFrames: Math.max(1, Math.round(props.durationSeconds * FEEDBACK_FPS)),
              props,
            })}
          />
        );
      })
    )}
  </>
);

