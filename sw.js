// Service worker — يخلي الأداة تفتح من غير نت ويحدّثها لوحدها لما ترفع نسخة جديدة
const CACHE = 'sec-pc-v55';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-512-maskable.png', './apple-touch-icon.png', './templates/main.xlsx', './templates/lv.xlsx'];
const LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(CORE);
    await Promise.all(LIBS.map(u => c.add(u).catch(() => {})));
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== 'share-inbox').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  // صور جاية من «مشاركة» في استوديو الموبايل
  if (r.method === 'POST' && u.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      let n = 0;
      try {
        const fd = await r.formData(), c = await caches.open('share-inbox');
        for (const f of fd.getAll('photos')) { if (f && f.size) { await c.put('./share-inbox/' + Date.now() + '-' + (n++), new Response(f, { headers: { 'content-type': f.type || 'image/jpeg' } })); } }
      } catch (err) {}
      return Response.redirect('./?shared=' + n, 303);
    })());
    return;
  }
  if (r.method !== 'GET' || /(^|\.)google\.com$|googleusercontent\.com$/.test(u.hostname)) return; // المزامنة دايماً من النت
  if (r.mode === 'navigate') {   // الصفحة نفسها: من النت الأول عشان التحديثات، ولو مفيش نت من الكاش
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', cp)); return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => {
    if (res.ok || res.type === 'opaque') { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); }
    return res;
  })));
});
