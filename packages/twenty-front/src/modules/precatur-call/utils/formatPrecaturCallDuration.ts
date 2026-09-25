export const formatPrecaturCallDuration = (durationInSeconds: number) => {
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = durationInSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
