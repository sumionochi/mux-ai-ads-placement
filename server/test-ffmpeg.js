const fetch = require('node-fetch');

const FFMPEG_SERVER = 'http://localhost:3001';

async function testFFmpegServer() {
  console.log('🧪 Testing FFmpeg Server...\n');

  try {
    // Test 1: Health check
    console.log('Test 1: Health Check');
    const healthResponse = await fetch(`${FFMPEG_SERVER}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    console.log('');

    // Test 2: Cleanup
    console.log('Test 2: Cleanup');
    const cleanupResponse = await fetch(`${FFMPEG_SERVER}/cleanup`, {
      method: 'POST',
    });
    const cleanupData = await cleanupResponse.json();
    console.log('✅ Cleanup:', cleanupData);
    console.log('');

    console.log('🎉 All tests passed!\n');
    console.log('FFmpeg server is ready to use.');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testFFmpegServer();