const express = require('express');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Promisify fs functions
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);
const readdir = promisify(fs.readdir);

// Ensure tmp directories exist
const ensureTmpDirs = async () => {
  const dirs = ['tmp/segments', 'tmp/ads', 'tmp/output'];
  for (const dir of dirs) {
    try {
      await mkdir(dir, { recursive: true });
      console.log(`✅ Directory ready: ${dir}`);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        console.error(`❌ Failed to create ${dir}:`, err);
      }
    }
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    message: 'FFmpeg worker is running',
    ffmpeg: ffmpeg.getAvailableFormats ? 'available' : 'not found'
  });
});

// Clean up old files endpoint
app.post('/cleanup', async (req, res) => {
  try {
    const dirs = ['tmp/segments', 'tmp/ads', 'tmp/output'];
    let deletedCount = 0;

    for (const dir of dirs) {
      const files = await readdir(dir);
      for (const file of files) {
        await unlink(path.join(dir, file));
        deletedCount++;
      }
    }

    res.json({ 
      success: true, 
      message: `Cleaned up ${deletedCount} files` 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Clip video endpoint
app.post('/clip', async (req, res) => {
  const { inputPath, outputPath, startTime, endTime } = req.body;

  if (!inputPath || !outputPath || startTime === undefined || endTime === undefined) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: inputPath, outputPath, startTime, endTime' 
    });
  }

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(endTime - startTime)
        .output(outputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .on('start', (cmd) => {
          console.log(`🎬 Clipping: ${startTime}s to ${endTime}s`);
          console.log(`Command: ${cmd}`);
        })
        .on('progress', (progress) => {
          console.log(`Progress: ${progress.percent?.toFixed(2)}%`);
        })
        .on('end', () => {
          console.log('✅ Clipping complete');
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ Clipping error:', err);
          reject(err);
        })
        .run();
    });

    res.json({ 
      success: true, 
      outputPath,
      message: 'Video clipped successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Stitch videos endpoint
app.post('/stitch', async (req, res) => {
  const { inputPaths, outputPath } = req.body;

  if (!inputPaths || !Array.isArray(inputPaths) || inputPaths.length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'inputPaths must be a non-empty array' 
    });
  }

  if (!outputPath) {
    return res.status(400).json({ 
      success: false, 
      error: 'outputPath is required' 
    });
  }

  try {
    // Create a temporary file list for FFmpeg concat
    const fileListPath = path.join('tmp', 'filelist.txt');
    const fileListContent = inputPaths
      .map(p => `file '${path.resolve(p)}'`)
      .join('\n');
    
    fs.writeFileSync(fileListPath, fileListContent);

    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(fileListPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions([
          '-c copy',  // Copy codec (faster, no re-encoding)
        ])
        .output(outputPath)
        .on('start', (cmd) => {
          console.log(`🎬 Stitching ${inputPaths.length} videos...`);
          console.log(`Command: ${cmd}`);
        })
        .on('progress', (progress) => {
          console.log(`Progress: ${progress.percent?.toFixed(2)}%`);
        })
        .on('end', () => {
          console.log('✅ Stitching complete');
          // Clean up file list
          fs.unlinkSync(fileListPath);
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ Stitching error:', err);
          // Clean up file list
          try {
            fs.unlinkSync(fileListPath);
          } catch (e) {}
          reject(err);
        })
        .run();
    });

    res.json({ 
      success: true, 
      outputPath,
      message: `Stitched ${inputPaths.length} videos successfully` 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get video info endpoint
app.post('/info', async (req, res) => {
  const { inputPath } = req.body;

  if (!inputPath) {
    return res.status(400).json({ 
      success: false, 
      error: 'inputPath is required' 
    });
  }

  try {
    const info = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });

    res.json({ 
      success: true, 
      info: {
        duration: info.format.duration,
        size: info.format.size,
        format: info.format.format_name,
        video: info.streams.find(s => s.codec_type === 'video'),
        audio: info.streams.find(s => s.codec_type === 'audio'),
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Stitch videos using concat
app.post('/stitch', async (req, res) => {
  try {
    const { concatListPath, outputPath } = req.body;

    console.log('🎬 Stitching videos...');
    console.log('Concat list:', concatListPath);
    console.log('Output:', outputPath);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Execute FFmpeg concat
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions([
          '-c copy', // Copy codec (faster, no re-encoding)
        ])
        .output(outputPath)
        .on('end', () => {
          console.log('✅ Stitching complete');
          resolve();
        })
        .on('error', (err) => {
          console.error('❌ Stitching failed:', err);
          reject(err);
        })
        .run();
    });

    res.json({
      success: true,
      outputPath,
    });

  } catch (error) {
    console.error('Stitching error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Start server
const startServer = async () => {
  await ensureTmpDirs();
  
  app.listen(PORT, () => {
    console.log('');
    console.log('🎥 ================================');
    console.log('🎥 FFmpeg Worker Server Started');
    console.log('🎥 ================================');
    console.log(`🎥 Port: ${PORT}`);
    console.log(`🎥 Health: http://localhost:${PORT}/health`);
    console.log('🎥 ================================');
    console.log('');
  });
};

startServer().catch(console.error);