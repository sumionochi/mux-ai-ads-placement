// lib/ffmpeg-utils.ts
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { TransitionOpportunity } from "./types";

/**
 * Ensure all required directories exist
 */
export function ensureDirectories() {
  const dirs = [
    path.join(process.cwd(), "tmp"),
    path.join(process.cwd(), "tmp", "segments"),
    path.join(process.cwd(), "tmp", "ads"),
    path.join(process.cwd(), "tmp", "final"),
    path.join(process.cwd(), "tmp", "frames"),
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log("📁 Created directory:", dir);
    }
  });
}

/**
 * Download video from URL to local filesystem
 */
export async function downloadVideo(
  url: string,
  outputPath: string
): Promise<void> {
  console.log("📥 Downloading video from:", url);

  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Failed to download: ${response.status} ${response.statusText}`
        );
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(outputPath, buffer);

      const sizeInMB = (buffer.length / 1024 / 1024).toFixed(2);
      console.log(`✅ Video downloaded: ${sizeInMB} MB → ${outputPath}`);

      resolve();
    } catch (error) {
      console.error("❌ Download failed:", error);
      reject(error);
    }
  });
}

/**
 * Get video duration in seconds
 */
export async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    console.log("⏱️  Getting video duration:", videoPath);

    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        console.error("❌ Failed to get duration:", err);
        reject(err);
      } else {
        const duration = metadata.format.duration || 0;
        console.log(`✅ Video duration: ${duration.toFixed(2)}s`);
        resolve(duration);
      }
    });
  });
}

/**
 * Video info
 */
export type VideoInfo = { width: number; height: number; fps: number };

function parseFps(rate?: string): number {
  // "30000/1001" or "30/1"
  if (!rate) return 30;
  const [n, d] = rate.split("/").map(Number);
  if (!d || !Number.isFinite(n) || !Number.isFinite(d)) return 30;
  return n / d;
}

export async function getVideoInfo(videoPath: string): Promise<VideoInfo> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);

      const v = metadata.streams.find((s) => s.codec_type === "video") as any;
      if (!v || !v.width || !v.height) {
        return reject(new Error(`No video stream found in ${videoPath}`));
      }

      const fps = parseFps(v.r_frame_rate) || 30;
      resolve({ width: v.width, height: v.height, fps });
    });
  });
}

/**
 * Check whether a file has an audio stream
 */
export async function hasAudioStream(inputPath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, meta) => {
      if (err) return reject(err);
      const hasAudio = meta.streams?.some((s) => s.codec_type === "audio");
      resolve(Boolean(hasAudio));
    });
  });
}

/**
 * Auto-add silent stereo audio (AAC) when a segment has no audio stream.
 * Returns original path if audio exists, otherwise returns a temp file path.
 */
export async function ensureAudioTrack(
  inputPath: string,
  outputDir = path.join(process.cwd(), "tmp", "segments"),
  sampleRate = 48000
): Promise<{ path: string; created: boolean }> {
  const ok = await hasAudioStream(inputPath);
  if (ok) return { path: inputPath, created: false };

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outPath = path.join(
    outputDir,
    `with_silence_${Date.now()}_${path.basename(inputPath)}`
  );

  console.log(
    `🔇 No audio stream found in ${path.basename(
      inputPath
    )} → adding silent audio`
  );

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      // Silent audio source from lavfi
      .input(`anullsrc=channel_layout=stereo:sample_rate=${sampleRate}`)
      .inputFormat("lavfi")
      .outputOptions([
        "-map 0:v:0",
        "-map 1:a:0",
        "-shortest", // stop when video ends (silence source is infinite)
        "-c:v copy", // keep video as-is
        "-c:a aac",
        "-b:a 192k",
        "-ar 48000",
        "-ac 2",
        "-movflags +faststart",
      ])
      .output(outPath)
      .on("end", () => {
        resolve({ path: outPath, created: true });
      })
      .on("error", (err, stdout, stderr) => {
        console.error("❌ ensureAudioTrack ffmpeg error:", err.message);
        console.error("----- ffmpeg stderr -----\n", stderr);
        console.error("----- ffmpeg stdout -----\n", stdout);
        reject(err);
      })
      .run();
  });
}

/**
 * Clip a segment from video
 * Uses -c copy for speed (frame-accurate cuts not guaranteed but fast)
 */
export async function clipVideo(
  inputPath: string,
  outputPath: string,
  startTime: number,
  duration: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(
      `✂️  Clipping: ${startTime}s for ${duration}s → ${path.basename(
        outputPath
      )}`
    );

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    ffmpeg()
      .input(inputPath)
      .inputOptions([`-ss ${startTime}`]) // seek on input
      .outputOptions([
        `-t ${duration}`,
        "-c copy",
        "-avoid_negative_ts make_zero",
        "-reset_timestamps 1",
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });
}

function timemarkToSeconds(t: string): number {
  // "HH:MM:SS.xx"
  const parts = t.split(":");
  if (parts.length !== 3) return 0;
  const [hh, mm, ss] = parts;
  return Number(hh) * 3600 + Number(mm) * 60 + Number.parseFloat(ss);
}

/**
 * Concatenate multiple videos into one (SAFE)
 * - Auto-adds silent audio to segments that have no audio stream
 * - Normalizes all inputs to SAME WxH/FPS + stereo 48k
 * - Uses concat FILTER and re-encodes to a consistent MP4
 */
export async function concatenateVideos(
  inputPaths: string[],
  outputPath: string,
  onProgress?: (percent: number) => void,
  totalDurationSec?: number
): Promise<void> {
  // 1) Ensure every input has an audio stream (auto-add silence when missing)
  const ensuredPaths: string[] = [];
  const tempCreated: string[] = [];

  for (const p of inputPaths) {
    const ensured = await ensureAudioTrack(p);
    ensuredPaths.push(ensured.path);
    if (ensured.created) tempCreated.push(ensured.path);
  }

  // 2) Pick target format from FIRST ensured segment
  const base = await getVideoInfo(ensuredPaths[0]);
  const targetW = base.width;
  const targetH = base.height;
  const targetFps = Math.round(base.fps || 30);

  return new Promise((resolve, reject) => {
    console.log(
      `🔗 Concatenating (SAFE) ${ensuredPaths.length} segments → ${targetW}x${targetH} @ ${targetFps}fps`
    );

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const cmd = ffmpeg();
    ensuredPaths.forEach((p) => cmd.input(p));

    const n = ensuredPaths.length;
    const filters: string[] = [];

    for (let i = 0; i < n; i++) {
      // Video normalize
      filters.push(
        `[${i}:v]` +
          `setpts=PTS-STARTPTS,` +
          `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,` +
          `pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2,` +
          `setsar=1,` +
          `fps=${targetFps},` +
          `format=yuv420p` +
          `[v${i}]`
      );

      // Audio normalize
      filters.push(
        `[${i}:a]` +
          `asetpts=PTS-STARTPTS,` +
          `aresample=async=1:first_pts=0,` +
          `aformat=sample_rates=48000:channel_layouts=stereo` +
          `[a${i}]`
      );
    }

    // ✅ IMPORTANT: concat inputs must be interleaved [v0][a0][v1][a1]...
    const concatInputs = Array.from(
      { length: n },
      (_, i) => `[v${i}][a${i}]`
    ).join("");
    filters.push(`${concatInputs}concat=n=${n}:v=1:a=1[v][a]`);

    cmd
      .complexFilter(filters)
      .outputOptions([
        "-map [v]",
        "-map [a]",
        "-c:v libx264",
        "-preset veryfast",
        "-crf 18",
        "-pix_fmt yuv420p",
        "-c:a aac",
        "-b:a 192k",
        "-ac 2",
        "-ar 48000",
        "-movflags +faststart",
      ])
      .output(outputPath)
      .on("progress", (p) => {
        if (!onProgress || !totalDurationSec || !p.timemark) return;
        const sec = timemarkToSeconds(p.timemark);
        onProgress(Math.min(100, Math.round((sec / totalDurationSec) * 100)));
      })
      .on("end", () => {
        cleanupFiles(tempCreated);
        resolve();
      })
      .on("error", (err, stdout, stderr) => {
        console.error("❌ Concatenation (SAFE) error:", err.message);
        console.error("----- ffmpeg stderr -----\n", stderr);
        console.error("----- ffmpeg stdout -----\n", stdout);
        cleanupFiles(tempCreated);
        reject(err);
      })
      .run();
  });
}

/**
 * Segment plan interface
 */
export interface SegmentPlan {
  type: "original" | "ad";
  start?: number; // For original segments
  end?: number; // For original segments
  duration?: number; // For original segments
  adPath?: string; // For ad segments
  transitionId?: string;
}

/**
 * Build smart segment plan - only processes selected transitions
 * This is the CORE algorithm that makes Phase 5 efficient
 */
export function buildSegmentPlan(
  selectedTransitions: TransitionOpportunity[],
  videoDuration: number
): SegmentPlan[] {
  const plan: SegmentPlan[] = [];

  // Sort transitions by time (ascending)
  const sorted = [...selectedTransitions].sort(
    (a, b) => a.frame_a_time - b.frame_a_time
  );

  console.log("📋 Building smart segment plan:");
  console.log(`   Video duration: ${videoDuration.toFixed(2)}s`);
  console.log(`   Selected transitions: ${sorted.length}`);

  let lastTime = 0;

  for (let i = 0; i < sorted.length; i++) {
    const transition = sorted[i];

    // Add original segment BEFORE this ad (if there's a gap)
    if (lastTime < transition.frame_a_time) {
      const segment: SegmentPlan = {
        type: "original",
        start: lastTime,
        end: transition.frame_a_time,
        duration: transition.frame_a_time - lastTime,
      };
      plan.push(segment);
      console.log(
        `   [${plan.length}] Original: ${segment.start?.toFixed(
          2
        )}s → ${segment.end?.toFixed(2)}s (${segment.duration?.toFixed(2)}s)`
      );
    }

    // Add the generated ad
    const adSegment: SegmentPlan = {
      type: "ad",
      adPath: transition.generated_video_path,
      transitionId: transition.id,
    };
    plan.push(adSegment);
    console.log(
      `   [${plan.length}] Ad: ${path.basename(
        transition.generated_video_path || "unknown"
      )}`
    );

    // Update lastTime to the end of this transition
    lastTime = transition.frame_b_time;
  }

  // Add final original segment AFTER last ad
  if (lastTime < videoDuration) {
    const segment: SegmentPlan = {
      type: "original",
      start: lastTime,
      end: videoDuration,
      duration: videoDuration - lastTime,
    };
    plan.push(segment);
    console.log(
      `   [${plan.length}] Original: ${segment.start?.toFixed(
        2
      )}s → ${segment.end?.toFixed(2)}s (${segment.duration?.toFixed(2)}s)`
    );
  }

  console.log(`✅ Segment plan complete: ${plan.length} total segments`);
  console.log(
    `   Original segments: ${plan.filter((s) => s.type === "original").length}`
  );
  console.log(`   Ad segments: ${plan.filter((s) => s.type === "ad").length}`);

  return plan;
}

/**
 * Cleanup temporary files
 */
export function cleanupFiles(files: string[]) {
  console.log(`🗑️  Cleaning up ${files.length} temporary files...`);

  let cleaned = 0;

  files.forEach((file) => {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        cleaned++;
      }
    } catch (error) {
      console.error(`❌ Failed to cleanup ${file}:`, error);
    }
  });

  console.log(`✅ Cleaned up ${cleaned} files`);
}

/**
 * Validate video file exists and is readable
 */
export function validateVideoFile(filePath: string): boolean {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Video file not found: ${filePath}`);
    return false;
  }

  const stats = fs.statSync(filePath);
  if (stats.size === 0) {
    console.error(`❌ Video file is empty: ${filePath}`);
    return false;
  }

  console.log(
    `✅ Video file valid: ${filePath} (${(stats.size / 1024 / 1024).toFixed(
      2
    )} MB)`
  );
  return true;
}

/**
 * Download video from HLS stream using FFmpeg
 * This is more reliable than trying to download MP4 directly from Mux
 */
export async function downloadFromHLS(
  hlsUrl: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("📥 Downloading from HLS stream:", hlsUrl);

    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    ffmpeg(hlsUrl)
      .outputOptions([
        "-c copy", // Copy codec for speed
        "-bsf:a aac_adtstoasc", // Fix AAC issues in HLS streams
      ])
      .output(outputPath)
      .on("start", (commandLine) => {
        console.log("🎬 FFmpeg command:", commandLine);
      })
      .on("progress", (progress) => {
        if (progress.percent) {
          console.log(`📊 Download progress: ${Math.round(progress.percent)}%`);
        }
      })
      .on("end", () => {
        const sizeInMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(
          2
        );
        console.log(`✅ HLS download complete: ${sizeInMB} MB → ${outputPath}`);
        resolve();
      })
      .on("error", (err) => {
        console.error("❌ HLS download failed:", err.message);
        reject(err);
      })
      .run();
  });
}
