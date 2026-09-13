// The visual proof is isolated from progression and its storage/solver UI.
const preview = new URLSearchParams(location.search).get('cube-preview') === '1';
if (preview) {
  try {
    const {startCubePreview} = await import('./cube-preview.mjs');
    await startCubePreview();
  } catch (error) {
    document.getElementById('status').textContent = `Unable to start preview: ${error.message}`;
  }
} else {
  await import('./app.mjs');
}
