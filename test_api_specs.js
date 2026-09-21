const app = require('./server');

console.log('====================================================');
console.log('       API ENDPOINTS & SERVER SPECS TEST SUITE      ');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAILED: ${message}`);
    process.exitCode = 1;
  }
}

const server = app.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Server listening on temporary port ${port}\n`);

  try {
    // 1. Static Files Serving
    console.log('[SPEC 7] Static Assets & Security Headers:');
    const htmlRes = await fetch(`${baseUrl}/`);
    assert(htmlRes.status === 200, 'GET / returns HTTP 200');
    assert(htmlRes.headers.get('content-type').includes('text/html'), 'GET / returns HTML content type');
    assert(htmlRes.headers.get('content-security-policy') !== null, 'Helmet CSP header is present');
    const htmlText = await htmlRes.text();
    assert(htmlText.includes('SaveMedia'), 'HTML contains SaveMedia brand title');
    assert(htmlText.includes('url-input'), 'HTML contains url-input element');

    const cssRes = await fetch(`${baseUrl}/css/styles.css`);
    assert(cssRes.status === 200, 'GET /css/styles.css returns HTTP 200');

    const jsRes = await fetch(`${baseUrl}/js/app.js`);
    assert(jsRes.status === 200, 'GET /js/app.js returns HTTP 200');

    // 2. Cookies Status Endpoint
    console.log('\n[SPEC 8] API: Cookies Status (/api/cookies-status):');
    const cookiesRes = await fetch(`${baseUrl}/api/cookies-status`);
    assert(cookiesRes.status === 200, 'GET /api/cookies-status returns HTTP 200');
    const cookiesData = await cookiesRes.json();
    assert(cookiesData.success === true, 'Cookies response success is true');
    assert(typeof cookiesData.hasCookies === 'boolean', 'Cookies status hasCookies is boolean');

    // 3. Fetch Info Validation
    console.log('\n[SPEC 9] API: Fetch Info Validation (/api/fetch-info):');
    const noUrlRes = await fetch(`${baseUrl}/api/fetch-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert(noUrlRes.status === 400, 'Missing URL returns HTTP 400');
    const noUrlData = await noUrlRes.json();
    assert(noUrlData.success === false, 'Missing URL success is false');

    const invalidUrlRes = await fetch(`${baseUrl}/api/fetch-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/not-a-video' })
    });
    assert(invalidUrlRes.status === 400, 'Unsupported URL returns HTTP 400');

    // 4. Live Pinterest Metadata Extraction
    console.log('\n[SPEC 10] API: Live Pinterest Metadata Extraction:');
    const pinTestUrl = 'https://www.pinterest.com/pin/1084663891475263837/';
    const pinFetchRes = await fetch(`${baseUrl}/api/fetch-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: pinTestUrl })
    });
    assert(pinFetchRes.status === 200, 'Live Pinterest fetch returns HTTP 200');
    const pinData = await pinFetchRes.json();
    assert(pinData.success === true, 'Pinterest fetch success is true');
    assert(pinData.data && pinData.data.title && pinData.data.title.includes('Gadget'), 'Title correctly extracted for Pinterest video');
    assert(pinData.data && pinData.data.detectedPlatform === 'pinterest', 'Detected platform is pinterest');
    assert(Array.isArray(pinData.data && pinData.data.formats) && pinData.data.formats.length > 0, 'Pinterest video formats array populated');
    const hasAudioEnabledFormat = pinData.data && pinData.data.formats && pinData.data.formats.some(f => f.hasAudio === true && f.quality !== 'audio');
    assert(hasAudioEnabledFormat, 'Video formats contain audio-enabled streams');
    const hasAudioOption = pinData.data && pinData.data.formats && pinData.data.formats.some(f => f.quality === 'audio' || f.type === 'audio');
    assert(hasAudioOption, 'MP3 audio extraction format option included');

    // 5. Download Endpoint Validation
    console.log('\n[SPEC 11] API: Download Route Validation (/api/download):');
    const noParamsDl = await fetch(`${baseUrl}/api/download`);
    assert(noParamsDl.status === 400, 'Download without parameters returns HTTP 400');

    // 6. Live Pinterest Video Streaming
    console.log('\n[SPEC 12] API: Live Media Streaming:');
    const abortCtrl = new AbortController();
    const videoDlUrl = `${baseUrl}/api/download?url=${encodeURIComponent(pinTestUrl)}&formatId=best&title=test_pinterest_video`;
    const videoDlRes = await fetch(videoDlUrl, { signal: abortCtrl.signal });
    assert(videoDlRes.status === 200, 'Video download returns HTTP 200');
    assert(videoDlRes.headers.get('content-type') === 'video/mp4', 'Video Content-Type is video/mp4');
    assert(videoDlRes.headers.get('content-disposition').includes('attachment'), 'Video Content-Disposition has attachment');

    // Read first chunk of video to verify stream flow
    const vReader = videoDlRes.body.getReader();
    const vChunk = await vReader.read();
    assert(vChunk.value && vChunk.value.length > 0, `Video stream successfully emits bytes (${vChunk.value.length} bytes in first chunk)`);
    abortCtrl.abort();

    console.log('\n====================================================');
    console.log(`TOTAL API SPECS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
    console.log('====================================================');

    server.close();
    process.exit(process.exitCode || 0);

  } catch (err) {
    console.error('\nUnexpected test error:', err);
    server.close();
    process.exit(1);
  }
});
