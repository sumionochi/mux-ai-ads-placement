// Client functions to call the FFmpeg worker server

const FFMPEG_SERVER = process.env.FFMPEG_SERVER_URL || "http://localhost:3001";

interface FFmpegResponse {
  success: boolean;
  outputPath?: string;
  message?: string;
  error?: string;
}

export async function clipVideo(
  inputPath: string,
  outputPath: string,
  startTime: number,
  endTime: number
): Promise<string> {
  const response = await fetch(`${FFMPEG_SERVER}/clip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputPath, outputPath, startTime, endTime }),
  });

  const data: FFmpegResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to clip video");
  }

  return data.outputPath!;
}

export async function stitchVideos(
  inputPaths: string[],
  outputPath: string
): Promise<string> {
  const response = await fetch(`${FFMPEG_SERVER}/stitch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputPaths, outputPath }),
  });

  const data: FFmpegResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to stitch videos");
  }

  return data.outputPath!;
}

export async function getVideoInfo(inputPath: string): Promise<any> {
  const response = await fetch(`${FFMPEG_SERVER}/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputPath }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to get video info");
  }

  return data.info;
}

export async function cleanupTmpFiles(): Promise<void> {
  const response = await fetch(`${FFMPEG_SERVER}/cleanup`, {
    method: "POST",
  });

  const data: FFmpegResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to cleanup files");
  }
}

export async function checkFFmpegHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${FFMPEG_SERVER}/health`);
    const data = await response.json();
    return data.status === "healthy";
  } catch {
    return false;
  }
}
