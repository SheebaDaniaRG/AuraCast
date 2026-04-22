// ===== AURACAST — FULL 3D INTERACTIVE APP =====

// ---- PROFILE & STATE ----
let profile = JSON.parse(localStorage.getItem('auracast_profile')) || null;
let weatherData = null;
let currentMood = 'Casual';
let outfitHistory = JSON.parse(localStorage.getItem('auracast_history')) || [];
const selections = { gender: '', skin: '', style: '' };

// ============================================================
//  3D MAGIC — CURSOR, PARTICLES, TILT, DANCING LETTERS
// ============================================================

// --- Custom Cursor ---
const cursor     = document.getElementById('cursor');
const cursorRing = document.getElementById('cursor-ring');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => {
  mx = e.clientX; my = e.clientY;
  cursor.style.left     = mx + 'px';
  cursor.style.top      = my + 'px';
});

// Smooth ring follow
function animateCursor() {
  rx += (mx - rx) * 0.12;
  ry += (my - ry) * 0.12;
  cursorRing.style.left = rx + 'px';
  cursorRing.style.top  = ry + 'px';
  requestAnimationFrame(animateCursor);
}
animateCursor();

// Cursor grow on interactive elements
document.addEventListener('mouseover', e => {
  if (e.target.matches('button, a, .option-card, .mood-pill, .rec-card, .checklist-item, .palette-swatch, .history-item')) {
    cursor.style.width   = '22px';
    cursor.style.height  = '22px';
    cursor.style.background = 'var(--rose)';
    cursorRing.style.width  = '58px';
    cursorRing.style.height = '58px';
    cursorRing.style.borderColor = 'var(--rose)';
  }
});
document.addEventListener('mouseout', e => {
  if (e.target.matches('button, a, .option-card, .mood-pill, .rec-card, .checklist-item, .palette-swatch, .history-item')) {
    cursor.style.width   = '14px';
    cursor.style.height  = '14px';
    cursor.style.background = 'var(--mauve)';
    cursorRing.style.width  = '42px';
    cursorRing.style.height = '42px';
    cursorRing.style.borderColor = 'var(--mauve)';
  }
});

// --- Particle System ---
const canvas = document.getElementById('particles');
const ctx    = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const PARTICLE_COLORS = ['#f7d6d0','#e8d5f0','#d0ede4','#fdf0d5','#c8a0c8','#e8a0a0'];

class Particle {
  constructor() { this.reset(); }
  reset() {
    this.x    = Math.random() * canvas.width;
    this.y    = Math.random() * canvas.height;
    this.size = Math.random() * 3.5 + 1;
    this.vx   = (Math.random() - 0.5) * 0.4;
    this.vy   = (Math.random() - 0.5) * 0.4 - 0.2;
    this.alpha = Math.random() * 0.5 + 0.1;
    this.color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    if (this.y < -10 || this.x < -10 || this.x > canvas.width + 10) this.reset();
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

for (let i = 0; i < 70; i++) particles.push(new Particle());

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animateParticles);
}
animateParticles();

// --- 3D Tilt on cards ---
function addTilt(selector, intensity = 12) {
  document.querySelectorAll(selector).forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect  = card.getBoundingClientRect();
      const cx    = rect.left + rect.width  / 2;
      const cy    = rect.top  + rect.height / 2;
      const dx    = (e.clientX - cx) / (rect.width  / 2);
      const dy    = (e.clientY - cy) / (rect.height / 2);
      const rotX  = -dy * intensity;
      const rotY  =  dx * intensity;

      card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.03)`;
      card.style.boxShadow = `${-rotY * 2}px ${rotX * 2}px 60px rgba(180,100,140,.28)`;

      // Spotlight
      const px = ((e.clientX - rect.left) / rect.width)  * 100;
      const py = ((e.clientY - rect.top)  / rect.height) * 100;
      card.style.setProperty('--mx', px + '%');
      card.style.setProperty('--my', py + '%');
      card.style.setProperty('--cx', px + '%');
      card.style.setProperty('--cy', py + '%');
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform  = '';
      card.style.boxShadow  = '';
    });
  });
}

// --- Dancing Letters ---
function makeDancing(el) {
  if (!el) return;
  const text = el.textContent;
  el.textContent = '';
  [...text].forEach(char => {
    const span = document.createElement('span');
    span.textContent = char === ' ' ? '\u00A0' : char;
    span.className = 'ltr';
    el.appendChild(span);
  });
}

// Apply dancing letters to all .dance-text elements
function initDancing() {
  document.querySelectorAll('.dance-text').forEach(el => makeDancing(el));
}

// --- Scroll Reveal ---
function initScrollReveal() {
  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        entry.target.style.transitionDelay = (i * 0.08) + 's';
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  revealEls.forEach(el => io.observe(el));
}

// ============================================================
//  ONBOARDING
// ============================================================
let currentStep = 1;

window.onload = () => {
  if (profile) showApp();
  else document.getElementById('onboarding').classList.remove('hidden');
};

function nextStep(step) {
  const nameInput = document.getElementById('userName');
  if (step === 1) {
    if (!nameInput.value.trim()) {
      nameInput.style.borderColor = '#e8a0a0';
      nameInput.placeholder = 'Please enter your name!';
      return;
    }
    profile = { name: nameInput.value.trim() };
  }
  if (step === 2 && !selections.gender) { shakePulse(); return; }
  if (step === 3 && !selections.skin)   { shakePulse(); return; }

  document.getElementById(`step${step}`).classList.remove('active');
  document.getElementById(`dot${step}`).classList.remove('active');
  currentStep = step + 1;
  document.getElementById(`step${currentStep}`).classList.add('active');
  document.getElementById(`dot${currentStep}`).classList.add('active');
}

function shakePulse() {
  const card = document.querySelector('.onboarding-card');
  card.style.animation = 'none';
  card.offsetHeight; // reflow
  card.style.animation = 'shake .4s ease';
}

function selectOption(el, key, value) {
  el.parentElement.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selections[key] = value;
}

function finishOnboarding() {
  if (!selections.style) { shakePulse(); return; }
  profile = { ...profile, ...selections };
  localStorage.setItem('auracast_profile', JSON.stringify(profile));
  document.getElementById('onboarding').classList.add('hidden');
  showApp();
}

function resetProfile() {
  if (confirm('Reset your profile?')) {
    localStorage.removeItem('auracast_profile');
    location.reload();
  }
}

// ============================================================
//  SHOW APP
// ============================================================
function showApp() {
  const app = document.getElementById('app');
  app.classList.remove('hidden');

  document.getElementById('userGreeting').textContent = `Hi, ${profile.name} ✦`;

  // Apply all 3D magic after DOM update
  setTimeout(() => {
    initDancing();
    initScrollReveal();
    addTilt('.weather-card', 8);
    addTilt('.rec-card', 14);
    addTilt('.share-card', 8);
  }, 100);

  loadHistory();
  getLocationAndWeather();
  requestNotificationPermission();
}

// ============================================================
//  WEATHER
// ============================================================
async function getLocationAndWeather() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => fetchWeather(pos.coords.latitude, pos.coords.longitude),
      () => fetchWeatherByCity('Mumbai')
    );
  } else {
    fetchWeatherByCity('Mumbai');
  }
}

async function searchCity() {
  const city = document.getElementById('cityInput').value.trim();
  if (!city) return;
  fetchWeatherByCity(city);
}

async function fetchWeatherByCity(city) {
  try {
    const geoRes  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
    const geoData = await geoRes.json();
    if (!geoData.results?.length) { alert('City not found!'); return; }
    const { latitude, longitude, name, country } = geoData.results[0];
    document.getElementById('locationName').textContent = `${name}, ${country}`;
    fetchWeather(latitude, longitude);
  } catch { useFallbackWeather(); }
}

async function fetchWeather(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,uv_index_max&hourly=relativehumidity_2m&timezone=auto&forecast_days=2`;
    const res  = await fetch(url);
    const data = await res.json();

    const tomorrow = {
      weatherCode:   data.daily.weathercode[1],
      maxTemp:       Math.round(data.daily.temperature_2m_max[1]),
      minTemp:       Math.round(data.daily.temperature_2m_min[1]),
      precipitation: data.daily.precipitation_sum[1],
      windSpeed:     Math.round(data.daily.windspeed_10m_max[1]),
      uvIndex:       Math.round(data.daily.uv_index_max[1]),
      humidity:      Math.round(data.hourly.relativehumidity_2m.slice(24,48).reduce((a,b)=>a+b,0)/24)
    };

    if (!document.getElementById('locationName').textContent.includes(',')) {
      document.getElementById('locationName').textContent = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    }

    weatherData = tomorrow;
    renderWeather(tomorrow);
    renderRecommendations();
    if (tomorrow.precipitation > 5) showRainPopup();

  } catch { useFallbackWeather(); }
}

function useFallbackWeather() {
  weatherData = { weatherCode:2, maxTemp:28, minTemp:22, precipitation:0, windSpeed:12, uvIndex:6, humidity:60 };
  document.getElementById('locationName').textContent = 'Demo Mode 🌸';
  renderWeather(weatherData);
  renderRecommendations();
}

const WMO = {
  0:  {label:'Clear Sky',       icon:'☀️', type:'sunny'},
  1:  {label:'Mainly Clear',    icon:'🌤️',type:'sunny'},
  2:  {label:'Partly Cloudy',   icon:'⛅', type:'cloudy'},
  3:  {label:'Overcast',        icon:'☁️', type:'cloudy'},
  45: {label:'Foggy',           icon:'🌫️',type:'foggy'},
  48: {label:'Icy Fog',         icon:'🌫️',type:'foggy'},
  51: {label:'Light Drizzle',   icon:'🌦️',type:'rainy'},
  61: {label:'Light Rain',      icon:'🌧️',type:'rainy'},
  63: {label:'Moderate Rain',   icon:'🌧️',type:'rainy'},
  65: {label:'Heavy Rain',      icon:'⛈️', type:'stormy'},
  71: {label:'Light Snow',      icon:'🌨️',type:'snowy'},
  80: {label:'Rain Showers',    icon:'🌦️',type:'rainy'},
  95: {label:'Thunderstorm',    icon:'⛈️', type:'stormy'},
};
function getWeatherInfo(code) { return WMO[code] || {label:'Partly Cloudy',icon:'⛅',type:'cloudy'}; }

function renderWeather(w) {
  const info = getWeatherInfo(w.weatherCode);
  document.getElementById('weatherIcon').textContent     = info.icon;
  document.getElementById('weatherDesc').textContent     = info.label;
  document.getElementById('humidityDisplay').textContent = `💧 ${w.humidity}%`;
  document.getElementById('windDisplay').textContent     = `💨 ${w.windSpeed} km/h`;
  document.getElementById('uvDisplay').textContent       = `☀️ UV ${w.uvIndex}`;

  // Dancing temp
  const tempEl = document.getElementById('tempDisplay');
  tempEl.textContent = `${w.maxTemp}°C`;
  makeDancing(tempEl);

  renderColorPalette(info.type, w.maxTemp);
  renderSkinAlerts(w);
  renderSeasonalBanner(w);
  renderBagChecklist(w);
  updateShareCard(info, w);

  // Re-init tilt on weather card after update
  setTimeout(() => addTilt('.weather-card', 8), 200);
}

// ============================================================
//  COLOR PALETTES
// ============================================================
const palettes = {
  sunny:  [['#FFD580','Sunny Gold'],['#FF8C69','Coral'],['#87CEEB','Sky Blue'],['#98FB98','Mint'],['#FFF8DC','Cream']],
  cloudy: [['#B0C4DE','Steel Blue'],['#D2B48C','Taupe'],['#8FBC8F','Sage'],['#D8BFD8','Thistle'],['#F5DEB3','Wheat']],
  rainy:  [['#4682B4','Ocean'],['#708090','Slate'],['#9370DB','Mauve'],['#20B2AA','Teal'],['#F0E68C','Pale Yellow']],
  stormy: [['#2F4F4F','Dark Slate'],['#696969','Dim Gray'],['#8B008B','Deep Violet'],['#191970','Midnight'],['#B0B0B0','Silver']],
  foggy:  [['#C0C0C0','Silver'],['#D3D3D3','Light Gray'],['#E6E6FA','Lavender'],['#F5F5DC','Beige'],['#DCDCDC','Gainsboro']],
  snowy:  [['#E0F0FF','Ice Blue'],['#B0D8F0','Powder'],['#F0F0FF','Lav White'],['#C8E8FF','Baby Blue'],['#FFFFFF','Pure White']],
  hot:    [['#FF6347','Tomato'],['#FF4500','Orange Red'],['#FFD700','Gold'],['#ADFF2F','Yellow Green'],['#00CED1','Teal']],
  cold:   [['#87CEEB','Sky Blue'],['#B0E0E6','Powder Blue'],['#ADD8E6','Light Blue'],['#E0FFFF','Light Cyan'],['#F0FFFF','Azure']],
};

function renderColorPalette(type, temp) {
  let key = temp >= 35 ? 'hot' : temp <= 10 ? 'cold' : type;
  const swatches = palettes[key] || palettes.cloudy;
  const container = document.getElementById('colorPalette');
  container.innerHTML = '';
  swatches.forEach(([color, name], i) => {
    const div = document.createElement('div');
    div.className = 'palette-swatch';
    div.style.cssText = `background:${color}; animation-delay:${i*0.08}s`;
    div.innerHTML = `<span class="swatch-tooltip">${name}</span>`;
    container.appendChild(div);
  });
}

// ============================================================
//  RECOMMENDATIONS
// ============================================================
const recs = {
  sunny: {
    hot: {
      Casual:       { outfit:['👗 Flowy sundress','👚 Linen crop top + shorts','🩴 Strappy sandals'], accessories:['🕶️ UV sunglasses','👒 Wide-brim hat','👜 Straw tote bag'], cosmetics:['🧴 SPF 50+ sunscreen','💧 Lightweight moisturiser','🌸 Tinted lip balm'], merch:['🌂 UV umbrella','💧 Water bottle','🧴 Mini sunscreen spray'] },
      Professional: { outfit:['👔 Linen blazer + wide-leg trousers','👗 Midi wrap dress','👡 Block heels'], accessories:['🕶️ Sleek sunglasses','👜 Structured handbag','⌚ Minimalist watch'], cosmetics:['🧴 SPF primer','💄 Long-wear lip colour','✨ Setting spray'], merch:['☂️ UV umbrella','🧴 Blotting papers','💧 Hydration mist'] },
      Glam:         { outfit:['✨ Sequin skirt + breezy blouse','👗 Off-shoulder maxi dress','👠 Strappy heels'], accessories:['💍 Statement earrings','👜 Metallic clutch','🕶️ Cat-eye sunglasses'], cosmetics:['💄 Bold lip colour','✨ Illuminating highlighter','👁️ Waterproof mascara'], merch:['🌂 UV umbrella','✨ Face mist','💅 Nail touch-up kit'] },
      Comfy:        { outfit:['🩳 Linen shorts + tank top','👕 Oversized tee + bike shorts','🩴 Flip-flops'], accessories:['🧢 Baseball cap','🎒 Mini backpack','🕶️ Round sunglasses'], cosmetics:['🧴 Tinted sunscreen','💧 Refreshing face mist','🌿 Aloe vera gel'], merch:['💧 Large water bottle','🧴 Sunscreen stick','🍃 Mini fan'] },
      Bold:         { outfit:['🌈 Colour-block co-ord set','👗 Bright printed maxi','👡 Platform sandals'], accessories:['💍 Chunky bangles','🕶️ Oversized tinted glasses','👜 Bold-coloured bag'], cosmetics:['💄 Neon lip colour','🎨 Graphic eyeliner','✨ Body shimmer'], merch:['🌂 Colourful UV umbrella','💦 Cooling towel','🧴 SPF setting spray'] },
    },
    mild: {
      Casual:       { outfit:['👖 High-waist jeans + breezy blouse','🧥 Light denim jacket','👟 White sneakers'], accessories:['🕶️ Aviator sunglasses','👜 Canvas tote','📿 Layered necklace'], cosmetics:['🧴 SPF moisturiser','🌸 Blush + highlighter combo','💋 Lip gloss'], merch:['💧 Water bottle','🧴 Sunscreen','📱 Portable charger'] },
      Professional: { outfit:['👗 A-line midi dress','🧥 Tailored blazer + trousers','👡 Kitten heels'], accessories:['⌚ Classic watch','👜 Leather tote','🔗 Pearl earrings'], cosmetics:['🧴 SPF foundation','💄 Nude lip','✨ Dewy setting spray'], merch:['💧 Water bottle','🧴 Blotting papers','📋 Leather planner'] },
      Glam:         { outfit:['✨ Wrap dress + statement belt','👗 Satin slip skirt + blazer','👠 Open-toe heels'], accessories:['💍 Layered gold chains','👜 Mini structured bag','🕶️ Oversized frames'], cosmetics:['💄 Statement lip','✨ Glass-skin base','👁️ Defined eye look'], merch:['💧 Facial mist','✨ Touch-up powder','💅 Nail file'] },
      Comfy:        { outfit:['🩳 Wide-leg joggers + linen shirt','🧥 Bomber jacket + tee','👟 Chunky sneakers'], accessories:['🧢 Bucket hat','🎒 Backpack','📿 Simple chain'], cosmetics:['🌿 Tinted SPF moisturiser','💧 Hydrating lip balm','✨ Light mascara'], merch:['💧 Water bottle','🎧 Earbuds','🧁 Healthy snack'] },
      Bold:         { outfit:['🌈 Printed coord set','🧥 Coloured leather jacket + jeans','👟 Bold chunky sneakers'], accessories:['💍 Statement ring stack','🕶️ Coloured frames','👜 Bright structured bag'], cosmetics:['💄 Bold lip colour','🎨 Coloured liner','✨ Blinding highlighter'], merch:['💧 Aesthetic water bottle','📸 Camera strap','🌂 Fun printed umbrella'] },
    }
  },
  rainy: {
    Casual:       { outfit:['🧥 Waterproof trench coat','👖 Dark slim jeans','🥾 Ankle rain boots'], accessories:['🌂 Compact umbrella','👜 Waterproof crossbody','🧣 Lightweight scarf'], cosmetics:['💧 Waterproof mascara','🧴 Anti-frizz serum','💄 Long-wear lip colour'], merch:['🌂 Sturdy umbrella','🥾 Boot spray','💧 Waterproof bag cover'] },
    Professional: { outfit:['🧥 Belted trench coat','👗 Midi dress + opaque tights','👠 Block heel boots'], accessories:['🌂 Sleek umbrella','👜 Leather-look bag','⌚ Classic watch'], cosmetics:['✨ Waterproof primer','💄 Transfer-proof lip','👁️ Waterproof kohl'], merch:['🌂 Windproof umbrella','🧴 Frizz control spray','💼 Waterproof sleeve'] },
    Glam:         { outfit:['✨ Sleek bodycon + knee boots','🧥 Patent trench coat','👠 Waterproof heeled booties'], accessories:['🌂 Metallic umbrella','👜 Chain-strap bag','💍 Bold earrings'], cosmetics:['💄 All-day lip colour','✨ Waterproof luminiser','👁️ Smudge-proof liner'], merch:['🌂 Designer-look umbrella','✨ Setting powder','🧴 Hair serum'] },
    Comfy:        { outfit:['🧥 Oversized rain jacket','👖 Comfy joggers','👟 Waterproof trainers'], accessories:['🎒 Waterproof backpack','🧢 Bucket hat','🧣 Cosy scarf'], cosmetics:['🌿 Tinted moisturiser','💧 Hydrating balm','✨ Light brow gel'], merch:['🌂 Foldable umbrella','🎧 Earbuds','☕ Thermal flask'] },
    Bold:         { outfit:['🌈 Brightly coloured rain jacket','👖 Wide-leg cargos','🥾 Chunky rain boots'], accessories:['🌂 Printed umbrella','👜 Vivid coloured bag','💍 Fun earrings'], cosmetics:['💄 Bold waterproof lip','🎨 Graphic liner','✨ Waterproof highlighter'], merch:['🌂 Large statement umbrella','💧 Mini flask','🌈 Colourful rain poncho'] },
  },
  cloudy: {
    Casual:       { outfit:['👕 Oversized knit sweater + jeans','🧥 Denim jacket + midi skirt','👟 Classic white sneakers'], accessories:['🕶️ Casual frames','👜 Canvas tote','📿 Simple necklace'], cosmetics:['🌿 BB cream','💄 Satin lip','✨ Light blush'], merch:['☕ Travel mug','🎧 Earbuds','🧴 Hydrating mist'] },
    Professional: { outfit:['🧥 Smart blazer + trousers','👗 Wrap midi dress','👡 Court heels'], accessories:['⌚ Statement watch','👜 Structured bag','🔗 Stud earrings'], cosmetics:['🧴 Matte foundation','💄 Classic lip colour','✨ Soft contour'], merch:['☕ Coffee flask','📋 Planner','💧 Water bottle'] },
    Glam:         { outfit:['✨ Satin wide-leg trousers + blouse','👗 Ruched midi dress','👠 Strappy mules'], accessories:['💍 Chandelier earrings','👜 Mini evening bag','🕶️ Retro frames'], cosmetics:['💄 Velvet lip','✨ Dewy glow base','👁️ Smoky eye'], merch:['✨ Touch-up kit','💅 Nail file','🌹 Perfume rollerball'] },
    Comfy:        { outfit:['🧥 Cosy hoodie + wide-leg joggers','👕 Soft long-sleeve + leggings','👟 Platform trainers'], accessories:['🧢 Beanie','🎒 Mini backpack','📿 Layered chains'], cosmetics:['🌿 Tinted balm','💧 Hydrating mist','✨ Mascara only'], merch:['☕ Thermal mug','🎧 Wireless earbuds','📚 Book + bookmark'] },
    Bold:         { outfit:['🌈 Printed power blazer set','👗 Asymmetric hem dress','👟 Bold platform shoes'], accessories:['💍 Oversized rings','🕶️ Coloured frames','👜 Bright structured bag'], cosmetics:['💄 Punchy lip colour','🎨 Double liner look','✨ Radiant glow'], merch:['☕ Colourful thermal','📸 Camera','🌂 Compact umbrella'] },
  },
  stormy: {
    Casual:       { outfit:['🧥 Heavy waterproof jacket','👖 Thick dark jeans','🥾 Sturdy ankle boots'], accessories:['🌂 Windproof umbrella','🎒 Waterproof backpack','🧣 Thick scarf'], cosmetics:['💧 Waterproof everything','🌿 Minimal SPF tint','💄 Stay-on lip balm'], merch:['🌂 Strong umbrella','🥾 Waterproofing spray','☕ Hot flask'] },
    Professional: { outfit:['🧥 Premium trench coat + suit','👗 Trouser suit','🥾 Chelsea boots'], accessories:['🌂 Sturdy compact umbrella','👜 Waterproof tote','⌚ Robust watch'], cosmetics:['💄 All-day transfer-proof','✨ Waterproof primer','👁️ Sealed mascara'], merch:['🌂 Golf-size umbrella','💼 Waterproof document bag','☕ Thermos flask'] },
    Glam:         { outfit:['✨ Statement leather jacket + boots','🧥 Structured coat + fitted turtleneck','👠 Knee-high boots'], accessories:['🌂 Chic umbrella','👜 Bold structured bag','💍 Dramatic earrings'], cosmetics:['💄 Bulletproof lip colour','✨ Long-wear foundation','👁️ Smudge-free kohl'], merch:['🌂 Windproof umbrella','✨ Translucent powder','🌹 Perfume rollerball'] },
    Comfy:        { outfit:['🧥 Puffer jacket + cosy joggers','👕 Thick hoodie + tracksuit','👟 Waterproof slip-ons'], accessories:['🧢 Waterproof cap','🎒 Dry bag backpack','🧣 Chunky knit scarf'], cosmetics:['🌿 Lip balm only','💧 Face oil for warmth','✨ Light mascara'], merch:['☕ Big thermal flask','🌂 Emergency poncho','🎧 Earbuds'] },
    Bold:         { outfit:['🌈 Bright windbreaker + cargos','🧥 Colourful puffer jacket','🥾 Chunky coloured boots'], accessories:['🌂 Large print umbrella','💍 Earring stack','👜 Bright dry bag'], cosmetics:['💄 Bold waterproof lip','🎨 Graphic liner','✨ Water-resistant glow'], merch:['🌂 Giant fun umbrella','☕ Statement flask','📸 Waterproof camera case'] },
  },
};

function getRecommendations(type, temp, mood) {
  const m = mood || 'Casual';
  if (type === 'sunny' || type === 'cloudy') {
    if (type === 'sunny') return (recs.sunny[temp >= 30 ? 'hot' : 'mild'] || {})[m] || recs.cloudy.Casual;
    return (recs.cloudy || {})[m] || recs.cloudy.Casual;
  }
  return (recs[type] || {})[m] || recs.cloudy.Casual;
}

function parseItem(str) {
  const m = str.match(/^(\S+)\s+(.+)$/);
  return m ? { icon: m[1], name: m[2] } : { icon: '✦', name: str };
}

function renderRecommendations() {
  if (!weatherData) return;
  const info = getWeatherInfo(weatherData.weatherCode);
  const rec  = getRecommendations(info.type, weatherData.maxTemp, currentMood);
  if (!rec) return;

  const map = { outfit:'outfit', accessory:'accessories', cosmetics:'cosmetics', merch:'merch' };
  ['outfit','accessory','cosmetics','merch'].forEach((type, ti) => {
    const items = rec[map[type]] || [];
    const cont  = document.getElementById(`${type}Items`);
    cont.innerHTML = items.map((s, i) => {
      const { icon, name } = parseItem(s);
      return `<div class="rec-item" style="animation-delay:${(ti*0.1 + i*0.08)}s">
        <div class="rec-item-icon">${icon}</div>
        <div class="rec-item-text"><strong>${name}</strong></div>
      </div>`;
    }).join('');
  });

  // Re-apply tilt to newly rendered cards
  setTimeout(() => addTilt('.rec-card', 14), 200);
  updateShareCard(info, weatherData);
}

function setMood(btn, mood) {
  document.querySelectorAll('.mood-pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentMood = mood;
  renderRecommendations();
}

// ============================================================
//  SKIN & HAIR ALERTS
// ============================================================
function renderSkinAlerts(w) {
  const container = document.getElementById('skinAlerts');
  const alerts = [];
  const skin = profile?.skin || 'Normal';

  if (w.uvIndex >= 6)     alerts.push({type:'warning', icon:'☀️', text:`UV ${w.uvIndex} — Apply SPF 50+ and reapply every 2hrs`});
  if (w.uvIndex <= 3)     alerts.push({type:'good',    icon:'🌤️', text:'Low UV today — SPF 30 is enough'});
  if (w.humidity >= 70)   alerts.push({type:'caution', icon:'💧', text:'High humidity — Use anti-frizz serum for hair'});
  if (w.humidity <= 35)   alerts.push({type:'warning', icon:'🌵', text:'Dry air — Extra moisturiser + hydrating mist needed'});
  if (skin==='Oily'   && w.humidity>=65) alerts.push({type:'caution',icon:'🧴',text:'Humidity increases oiliness — Use matte primer + blotting papers'});
  if (skin==='Dry'    && w.humidity<=40) alerts.push({type:'warning',icon:'🌸',text:'Dry conditions — Layer serum + rich moisturiser before SPF'});
  if (skin==='Sensitive')                alerts.push({type:'caution',icon:'🌼',text:'Sensitive skin tip — Fragrance-free products reduce flare-ups'});
  if (w.windSpeed >= 30)  alerts.push({type:'caution', icon:'💨', text:`Wind ${w.windSpeed}km/h — Tie back hair, protect with a hat`});
  if (w.maxTemp >= 35)    alerts.push({type:'warning', icon:'🥵', text:'Extreme heat — Stay hydrated, cooling face mist recommended'});
  if (!alerts.length)     alerts.push({type:'good',    icon:'✨', text:'Great skin weather today! Minimal extra care needed'});

  container.innerHTML = alerts.map((a,i) =>
    `<div class="alert-chip ${a.type}" style="animation-delay:${i*0.1}s">${a.icon} ${a.text}</div>`
  ).join('');
}

// ============================================================
//  SEASONAL BANNER
// ============================================================
function renderSeasonalBanner(w) {
  const banner = document.getElementById('seasonalBanner');
  const month  = new Date().getMonth() + 1;
  const msgs   = {
    3:'🌸 Spring is here! Time to swap heavy winter layers for light pastels and linens.',
    6:'☀️ Summer is heating up! Bring out your breezy dresses and sunscreen stash.',
    9:'🍂 Autumn is arriving! Transition to warm earth tones, cosy knits, and ankle boots.',
    12:'❄️ Winter wardrobe alert! Layer up with coats, scarves, and thermal innerwear.'
  };
  if (msgs[month]) { banner.textContent = msgs[month]; banner.classList.add('show'); }
}

// ============================================================
//  RAIN POPUP
// ============================================================
function showRainPopup()  { document.getElementById('rainPopup').classList.remove('hidden'); }
function closeRainPopup() { document.getElementById('rainPopup').classList.add('hidden'); }

// ============================================================
//  BAG CHECKLIST
// ============================================================
function renderBagChecklist(w) {
  const info  = getWeatherInfo(w.weatherCode);
  const items = ['💧 Water bottle','📱 Portable charger','💊 Medicines / band-aids'];
  if (w.uvIndex >= 4)          items.push('🧴 Sunscreen','🕶️ Sunglasses');
  if (w.precipitation > 0)     items.push('🌂 Umbrella','🥾 Waterproof shoes');
  if (w.maxTemp >= 30)         items.push('🧊 Cooling face mist','🌬️ Mini fan');
  if (w.maxTemp <= 18)         items.push('🧣 Scarf / jacket','🧤 Gloves if needed');
  if (w.humidity >= 65)        items.push('🌿 Anti-frizz hair product');
  if (info.type === 'stormy')  items.push('☂️ Windproof umbrella','🧥 Heavy rain gear');
  items.push('💄 Touch-up cosmetics','🏷️ Lip balm','🧴 Hand cream');

  const container = document.getElementById('bagChecklist');
  container.innerHTML = items.map(item =>
    `<label class="checklist-item">
      <input type="checkbox" onclick="this.parentElement.classList.toggle('checked')"/>
      <span>${item}</span>
    </label>`
  ).join('');
}

// ============================================================
//  OUTFIT HISTORY
// ============================================================
function loadHistory() {
  const container = document.getElementById('outfitHistory');
  if (!outfitHistory.length) {
    container.innerHTML = '<p class="history-empty">No saved looks yet. Save today\'s look below! ✦</p>';
    return;
  }
  container.innerHTML = outfitHistory.slice(-6).reverse().map(item =>
    `<div class="history-item">
      <div class="history-item-icon">${item.icon}</div>
      <div class="history-item-date">${item.date}</div>
      <div class="history-item-look">${item.mood} · ${item.weather}</div>
    </div>`
  ).join('');
}

function saveTodaysLook() {
  if (!weatherData) return;
  const info = getWeatherInfo(weatherData.weatherCode);
  outfitHistory.push({
    icon: info.icon,
    date: new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short'}),
    mood: currentMood,
    weather: `${weatherData.maxTemp}°C ${info.label}`
  });
  if (outfitHistory.length > 20) outfitHistory.shift();
  localStorage.setItem('auracast_history', JSON.stringify(outfitHistory));
  loadHistory();
  const btn = document.querySelector('.save-look-btn');
  btn.textContent = '✓ Look Saved!';
  setTimeout(() => { btn.textContent = '✦ Save Today\'s Look'; }, 2000);
}

// ============================================================
//  SHARE CARD
// ============================================================
function updateShareCard(info, w) {
  const rec = getRecommendations(info.type, w.maxTemp, currentMood);
  document.getElementById('shareWeather').textContent = `${info.icon} ${info.label} · ${w.maxTemp}°C · ${currentMood} Mood`;
  document.getElementById('shareOutfit').textContent  = rec?.outfit?.slice(0,2).join(' · ') || '';
  setTimeout(() => addTilt('.share-card', 8), 200);
}

function shareCard() {
  if (!weatherData) return;
  const info = getWeatherInfo(weatherData.weatherCode);
  const rec  = getRecommendations(info.type, weatherData.maxTemp, currentMood);
  const text = `✦ My AuraCast for tomorrow!\n\nWeather: ${info.icon} ${info.label} · ${weatherData.maxTemp}°C\nMood: ${currentMood}\nOutfit: ${rec?.outfit?.slice(0,2).join(', ')}\n\n#AuraCast #WearTheWeather`;
  if (navigator.share) navigator.share({ title:'My AuraCast', text });
  else navigator.clipboard.writeText(text).then(() => alert('Look copied to clipboard! Paste it anywhere ✦'));
}

// ============================================================
//  NOTIFICATIONS
// ============================================================
function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    setTimeout(() => Notification.requestPermission().then(p => { if (p==='granted') scheduleNotification(); }), 3000);
  } else if (Notification.permission === 'granted') {
    scheduleNotification();
  }
}

function scheduleNotification() {
  const lastNotif = localStorage.getItem('auracast_last_notif');
  const today = new Date().toDateString();
  if (lastNotif === today) return;
  setTimeout(() => {
    if (weatherData) {
      const info = getWeatherInfo(weatherData.weatherCode);
      new Notification('✦ AuraCast Daily Look', {
        body: `Tomorrow: ${info.icon} ${info.label} · ${weatherData.maxTemp}°C\nOpen AuraCast to see your outfit picks!`,
        icon: '🌸'
      });
      localStorage.setItem('auracast_last_notif', today);
    }
  }, 5000);
}

// ============================================================
//  SHAKE ANIMATION (for onboarding validation)
// ============================================================
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
@keyframes shake {
  0%,100%{transform:scale(1) rotateX(0)}
  25%    {transform:scale(.98) translateX(-10px) rotateY(-3deg)}
  75%    {transform:scale(.98) translateX(10px)  rotateY(3deg)}
}`;
document.head.appendChild(shakeStyle);