/* Shared paws: the public photo wall.
   Reads approved photos from Supabase and lets anyone send one in.
   Nothing a visitor sends is shown until an admin approves it
   (see supabase/migrations/20260917090000_shared_paws.sql). */
(function () {
  'use strict';

  var SUPABASE = 'https://qyyydmjrrtyauyawheos.supabase.co';
  // The public "anon" key: safe in a web page, it can only do what the
  // row-level security policies allow (add a pending photo, read approved).
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5eXlkbWpycnR5YXV5YXdoZW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0ODU5MjMsImV4cCI6MjEwMTA2MTkyM30.' +
    'O93FlNx3Sd0QGutNLUEcGH-aUMa4KNcn_V-rzVZc9-o';
  var BUCKET = 'shared-paws';
  var MAX_SIDE = 1600;
  var MAX_BYTES = 5 * 1024 * 1024;

  var wall = document.getElementById('paw-wall');
  var form = document.getElementById('paw-form');
  if (!wall) return;

  function headers(extra) {
    var h = { apikey: ANON, Authorization: 'Bearer ' + ANON };
    for (var k in extra) h[k] = extra[k];
    return h;
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------------------------------------------------------- the wall */
  function card(p) {
    var who = [p.name, p.place].filter(Boolean).map(esc).join(' &middot; ');
    var el = document.createElement('figure');
    el.className = 'paw';
    el.innerHTML =
      '<img loading="lazy" decoding="async" alt="' + esc(p.story || 'A street animal someone helped') + '" src="' +
      SUPABASE + '/storage/v1/object/public/' + BUCKET + '/' + esc(p.photo_path) + '">' +
      '<figcaption>' + (p.story ? '<p>' + esc(p.story) + '</p>' : '') +
      (who ? '<span>' + who + '</span>' : '') + '</figcaption>';
    return el;
  }

  fetch(SUPABASE + '/rest/v1/shared_paws?select=name,place,story,photo_path' +
        '&status=eq.approved&order=created_at.desc&limit=200',
        { headers: headers({}) })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (rows) {
      (rows || []).forEach(function (p) { wall.appendChild(card(p)); });
    })
    .catch(function () { /* the founding photos are already on the page */ });

  if (!form) return;

  /* ------------------------------------------------------------ sending */
  var fileIn = form.querySelector('#paw-photo');
  var preview = form.querySelector('.paw-preview');
  var status = form.querySelector('.paw-status');
  var button = form.querySelector('button[type=submit]');
  var story = form.querySelector('#paw-story');
  var count = form.querySelector('.paw-count');

  function say(msg, kind) {
    status.textContent = msg;
    status.className = 'paw-status' + (kind ? ' ' + kind : '');
  }

  if (story && count) {
    story.addEventListener('input', function () {
      count.textContent = story.value.length + ' / 400';
    });
  }

  fileIn.addEventListener('change', function () {
    say('');
    var f = fileIn.files && fileIn.files[0];
    if (!f) { preview.hidden = true; return; }
    var url = URL.createObjectURL(f);
    var img = preview.querySelector('img');
    img.onload = function () { preview.hidden = false; };
    img.onerror = function () {
      preview.hidden = true;
      say('This photo format can’t be opened here. Please choose a JPEG or PNG ' +
          '(on an iPhone: Settings → Camera → Formats → Most Compatible).', 'bad');
    };
    img.src = url;
  });

  // Draw the photo onto a canvas and re-encode it: smaller to send, and the
  // phone's hidden location data does not survive the trip.
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        var s = Math.min(1, MAX_SIDE / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.round(w * s); c.height = Math.round(h * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        (function encode(q) {
          c.toBlob(function (b) {
            if (!b) return reject(new Error('encode'));
            if (b.size > MAX_BYTES && q > 0.5) return encode(q - 0.1);
            resolve(b);
          }, 'image/jpeg', q);
        })(0.86);
      };
      img.onerror = function () { reject(new Error('decode')); };
      img.src = URL.createObjectURL(file);
    });
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (form.querySelector('#paw-website').value) return;  // bots fill hidden fields
    var f = fileIn.files && fileIn.files[0];
    if (!f) return say('Choose a photo first.', 'bad');
    if (!form.querySelector('#paw-consent').checked) {
      return say('Please tick the box to say the photo is yours to share.', 'bad');
    }
    button.disabled = true;
    say('Sending your photo…');

    var path = 'uploads/' + uuid() + '.jpg';
    shrink(f).then(function (blob) {
      return fetch(SUPABASE + '/storage/v1/object/' + BUCKET + '/' + path, {
        method: 'POST',
        headers: headers({ 'Content-Type': 'image/jpeg', 'x-upsert': 'false' }),
        body: blob
      });
    }).then(function (r) {
      if (!r.ok) throw new Error('upload ' + r.status);
      return fetch(SUPABASE + '/rest/v1/shared_paws', {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body: JSON.stringify({
          name: form.querySelector('#paw-name').value.trim() || null,
          place: form.querySelector('#paw-place').value.trim() || null,
          story: story.value.trim() || null,
          photo_path: path,
          consent: true
        })
      });
    }).then(function (r) {
      if (!r.ok) throw new Error('save ' + r.status);
      form.reset();
      preview.hidden = true;
      if (count) count.textContent = '0 / 400';
      say('Thank you. We look at every photo before it goes up, so yours will appear here ' +
          'once we have seen it.', 'good');
    }).catch(function (e) {
      say(e && e.message === 'decode'
        ? 'This photo format can’t be opened here. Please choose a JPEG or PNG.'
        : 'That didn’t send. Check your connection and try again.', 'bad');
    }).then(function () { button.disabled = false; });
  });
})();
