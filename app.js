// Camping Checklist App

// DOM helpers
const $ = (sel) => document.querySelector(sel);

// Top controls
const tripSelect = $('#tripSelect');
const listEl = $('#list');
const itemName = $('#itemName');
const itemCat = $('#itemCat');
const addItemBtn = $('#addItemBtn');
const resetChecksBtn = $('#resetChecksBtn');
const deleteTripBtn = $('#deleteTripBtn');
const newTripBtn = $('#newTripBtn');
const filterCat = $('#filterCat');

// Backup (now at the bottom in index.html)
const exportBtn = $('#exportBtn');
const importFile = $('#importFile');

// Templates
const templateSelect = $('#templateSelect');
const applyTemplateBtn = $('#applyTemplateBtn');
const saveTemplateBtn = $('#saveTemplateBtn');
const deleteTemplateBtn = $('#deleteTemplateBtn');

// Sort + progress
const sortBtn = $('#sortBtn');
const progressBadge = $('#progressBadge');

// State
let state = {
  trips: {},           // {tripId: {name, items:[{id,name,cat,done}] }}
  templates: {},       // {templateId: {name, items:[{name,cat}] }}
  activeTripId: null,
  sortMode: 'unpacked' // 'unpacked' | 'alpha' | 'category'
};

const LS_KEY = 'camping-checklist-v1';

// Default template
const DEFAULT_TEMPLATE = {
  name: 'Basic Camping Kit',
  items: [
    {name:'Tent', cat:'Shelter'},
    {name:'Tent pegs', cat:'Shelter'},
    {name:'Sleeping bag', cat:'Sleep'},
    {name:'Sleeping mat', cat:'Sleep'},
    {name:'Pillow', cat:'Sleep'},
    {name:'Camp chairs', cat:'Camp'},
    {name:'Headlamp / torch', cat:'Lighting'},
    {name:'Batteries / power bank', cat:'Power'},
    {name:'Esky / cooler', cat:'Food'},
    {name:'Ice packs', cat:'Food'},
    {name:'Stove / gas', cat:'Cooking'},
    {name:'Lighter / matches', cat:'Cooking'},
    {name:'Cookset / pan', cat:'Cooking'},
    {name:'Plates / bowls', cat:'Cooking'},
    {name:'Cutlery', cat:'Cooking'},
    {name:'Mugs / cups', cat:'Cooking'},
    {name:'Water', cat:'Water'},
    {name:'First aid kit', cat:'Safety'},
    {name:'Sunscreen / mozzie spray', cat:'Toiletries'},
    {name:'Toilet paper', cat:'Toiletries'},
    {name:'Warm jacket', cat:'Clothing'},
    {name:'Rain jacket', cat:'Clothing'},
    {name:'Trash bags', cat:'Camp'},
  ]
};

// Utils
function uid() { return Math.random().toString(36).slice(2,10); }

function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
  render();
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) state = JSON.parse(raw);
  } catch (e) {}

  // Seed templates
  if (!state.templates || Object.keys(state.templates).length === 0) {
    const tid = uid();
    state.templates = { [tid]: DEFAULT_TEMPLATE };
  }
  // Seed a first trip
  if (!state.trips || Object.keys(state.trips).length === 0) {
    const newId = uid();
    state.trips[newId] = {
      name: `Trip ${new Date().toLocaleDateString()}`,
      items: DEFAULT_TEMPLATE.items.map(i => ({id:uid(), name:i.name, cat:i.cat, done:false}))
    };
    state.activeTripId = newId;
  }
  if (!state.activeTripId) state.activeTripId = Object.keys(state.trips)[0];
  if (!state.sortMode) state.sortMode = 'unpacked';

  render();
}

// Render
function render() {
  // Trip select
  tripSelect.innerHTML = '';
  Object.entries(state.trips).forEach(([id, t]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = t.name;
    if (id === state.activeTripId) opt.selected = true;
    tripSelect.appendChild(opt);
  });

  // Template select
  templateSelect.innerHTML = '';
  Object.entries(state.templates).forEach(([id, t]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = t.name;
    templateSelect.appendChild(opt);
  });

  // Items
  const trip = state.trips[state.activeTripId];
  if (!trip) return;

  const filter = (filterCat?.value || '').trim().toLowerCase();
  let items = trip.items.slice();

  // ---- Sorting modes ----
  if (state.sortMode === 'unpacked') {
    // Unpacked first, then A–Z
    items.sort((a, b) => Number(a.done) - Number(b.done) || a.name.localeCompare(b.name));
  } else if (state.sortMode === 'alpha') {
    // A–Z by name
    items.sort((a, b) => a.name.localeCompare(b.name));
  } else if (state.sortMode === 'category') {
    // Category, then Unpacked first, then A–Z
    items.sort((a, b) => {
      const catA = (a.cat || '').toLowerCase();
      const catB = (b.cat || '').toLowerCase();
      return catA.localeCompare(catB) ||
             (Number(a.done) - Number(b.done)) ||
             a.name.localeCompare(b.name);
    });
  }

  // Filter by category text
  if (filter) items = items.filter(i => (i.cat || '').toLowerCase().includes(filter));

  // Build list
  listEl.innerHTML = '';
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'item';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = item.done;
    cb.addEventListener('change', () => { item.done = cb.checked; save(); });

    const name = document.createElement('div');
    name.className = 'name';
    const title = document.createElement('div');
    title.textContent = item.name;
    const cat = document.createElement('div');
    cat.className = 'cat';
    cat.textContent = item.cat || '—';
    name.appendChild(title);
    name.appendChild(cat);

    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.className = 'danger';
    del.addEventListener('click', () => {
      trip.items = trip.items.filter(i => i.id !== item.id);
      save();
    });

    row.appendChild(cb);
    row.appendChild(name);
    row.appendChild(del);
    listEl.appendChild(row);
  });

  // Progress + sort label
  const total = trip.items.length;
  const doneCount = trip.items.filter(i => i.done).length;
  progressBadge.textContent = `${doneCount}/${total} packed`;

  sortBtn.textContent =
    state.sortMode === 'unpacked' ? 'Sort: Unpacked ↑' :
    state.sortMode === 'alpha'    ? 'Sort: A–Z' :
                                    'Sort: Category';
}

// Event wiring
tripSelect.addEventListener('change', () => {
  state.activeTripId = tripSelect.value;
  save();
});

addItemBtn.addEventListener('click', () => {
  const name = itemName.value.trim();
  const cat = itemCat.value.trim();
  if (!name) return;
  const trip = state.trips[state.activeTripId];
  trip.items.push({id:uid(), name, cat, done:false});
  itemName.value = '';
  itemCat.value = '';
  save();
});

itemName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addItemBtn.click();
});

resetChecksBtn.addEventListener('click', () => {
  const trip = state.trips[state.activeTripId];
  trip.items.forEach(i => i.done = false);
  save();
});

deleteTripBtn.addEventListener('click', () => {
  if (!confirm('Delete this trip?')) return;
  delete state.trips[state.activeTripId];
  state.activeTripId = Object.keys(state.trips)[0] || null;
  if (!state.activeTripId) {
    const id = uid();
    state.trips[id] = { name: `Trip ${new Date().toLocaleDateString()}`, items: [] };
    state.activeTripId = id;
  }
  save();
});

newTripBtn.addEventListener('click', () => {
  const name = prompt('Name your trip:', `Trip ${new Date().toLocaleDateString()}`);
  if (!name) return;
  const id = uid();
  state.trips[id] = { name, items: [] };
  state.activeTripId = id;
  save();
});

filterCat.addEventListener('input', render);

// Export / Import (unchanged; they just moved in HTML)
exportBtn.addEventListener('click', () => {
  const data = {
    trips: state.trips,
    templates: state.templates
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'camping-checklist-backup.json';
  a.click();
  URL.revokeObjectURL(url);
});

importFile.addEventListener('change', () => {
  const file = importFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (data.trips) state.trips = data.trips;
      if (data.templates) state.templates = data.templates;
      // Ensure IDs and booleans exist
      for (const [, trip] of Object.entries(state.trips)) {
        trip.items.forEach(i => {
          if (!i.id) i.id = uid();
          if (typeof i.done !== 'boolean') i.done = false;
        });
      }
      if (!state.activeTripId || !state.trips[state.activeTripId]) {
        state.activeTripId = Object.keys(state.trips)[0];
      }
      save();
      alert('Imported 👍');
    } catch (e) {
      alert('Import failed: not valid JSON.');
    }
  };
  reader.readAsText(file);
});

// Templates
applyTemplateBtn.addEventListener('click', () => {
  const tid = templateSelect.value;
  const tpl = state.templates[tid];
  if (!tpl) return;
  const trip = state.trips[state.activeTripId];
  const existingNames = new Set(trip.items.map(i => i.name.toLowerCase()));
  tpl.items.forEach(ti => {
    if (!existingNames.has(ti.name.toLowerCase())) {
      trip.items.push({id:uid(), name:ti.name, cat:ti.cat, done:false});
    }
  });
  save();
});

saveTemplateBtn.addEventListener('click', () => {
  const name = prompt('Template name:');
  if (!name) return;
  const trip = state.trips[state.activeTripId];
  const items = trip.items.map(i => ({name:i.name, cat:i.cat}));
  const id = uid();
  state.templates[id] = { name, items };
  save();
});

deleteTemplateBtn.addEventListener('click', () => {
  const id = templateSelect.value;
  if (!id) return;
  if (!confirm('Delete this template?')) return;
  delete state.templates[id];
  save();
});

// Sort: cycle through modes
const SORT_MODES = ['unpacked', 'alpha', 'category'];
sortBtn.addEventListener('click', () => {
  const i = SORT_MODES.indexOf(state.sortMode);
  state.sortMode = SORT_MODES[(i + 1) % SORT_MODES.length];
  save();
});

// Cross-tab sync
window.addEventListener('storage', (e) => {
  if (e.key === LS_KEY) load();
});

// Init
load();
