declare module 'imagetracerjs' {
  const tracer: {
    imagedataToSVG(image: ImageData, options: Record<string, unknown>): string;
  };
  export default tracer;
}
