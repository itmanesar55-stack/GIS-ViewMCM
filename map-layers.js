// Generated from the portal index.html by tools/sync_public_view.py - edit index.html, not this file.
// Copied verbatim into the public GitHub Pages view by tools/sync_public_view.py - keep it self-contained
// (only Leaflet, omnivore and DOM APIs) and use relative data paths.
const KML_LAYERS = [
  { name: 'Municipal Boundary', category: 'Boundaries', color: '#e6194b', show: true, files: ['FINALMCM.kml'] },
  { name: 'Authorized Colonies', category: 'Colonies & Infrastructure', color: '#0072b2', show: false, files: ['Bhangrola_B-7954.kml', 'Wazirpur_Enclave_B-44.kml', 'Saheed_Bagat_Singh_Colony.kml'] },
  { name: 'Lal Dora', category: 'Land Records', color: '#f58231', show: false, files: ['ManesarLalDora.kml'] },
  { name: 'Zones', category: 'Boundaries', color: '#911eb4', show: false, files: ['MCM_ZONE_KML.kml'] },
  { name: 'Village Boundary', category: 'Boundaries', color: '#3cb44b', show: false, files: ['village_boundary.kml'], nameLabels: true },
  { name: 'Roads', category: 'Colonies & Infrastructure', color: '#333333', show: false, files: ['Municipal_Corporation_Manesar.kml'] },
  { name: 'Ward Boundaries', category: 'Boundaries', color: '#ffd400', show: true, files: ['MCM_Wards.kml'], wardLabels: true },
  // Khasra-level land parcels from GMDA OneMap (rebuilt by tools/export_gmda_mcm.py).
  { name: 'MCM Land (Khasra)', category: 'Land Records', color: '#00e5ff', show: false, geojson: 'MCM_Land.geojson' },
  // All-village cadastral parcels, one file per village (tools/export_gmda_cadastral.py); fetched per village as you zoom in.
  { name: 'Cadastral - All Villages (zoom in)', category: 'Land Records', color: '#ffeb3b', show: false, cadastral: 'cadastral/' }
];
// Order of the groups in the layer dropdown (like OneMap's layer list).
const KML_LAYER_CATEGORIES = ['Boundaries', 'Land Records', 'Colonies & Infrastructure'];
const KHASRA_LABEL_MIN_ZOOM = 17;
const CADASTRAL_MIN_ZOOM = 15, CADASTRAL_LABEL_MIN_ZOOM = 18;
function cadastralPopupHtml(p) {
  const khasra = p.m && p.m !== '0' && p.k ? p.m + '//' + p.k : (p.k || p.m || '');
  const rows = [['Village', p.v], ['Murabba No.', p.m], ['Khasra No.', p.k], ['Tehsil', p.t], ['Village code', p.vc],
    ['Area', p.area ? Number(p.area).toLocaleString('en-IN') + ' m² (' + (p.area / 4046.86).toFixed(3) + ' acre)' : ''],
    // 1 marla = 272.25 sq ft = 25.2929 m² = 9 sq. karam
    ['Kanal-Marla', p.area ? kanalMarla(p.area / 25.2929 * 9) : '']];
  return '<b>' + escapeLabel(p.v || '') + (khasra ? ' — ' + escapeLabel(khasra) : '') + '</b><table class="land-popup">' +
    rows.filter(r => r[1]).map(r => '<tr><th>' + r[0] + '</th><td>' + escapeLabel(r[1]) + '</td></tr>').join('') + '</table>' +
    '<div class="land-popup-src">Source: GMDA OneMap cadastral layer</div>';
}
// Cadastral: index.json lists each village's extent; a village's parcels are fetched the first time it comes into
// view at zoom >= CADASTRAL_MIN_ZOOM, then kept. Khasra labels only at zoom >= CADASTRAL_LABEL_MIN_ZOOM, in view.
function loadCadastral(targetMap, group, layerGroup, passive) {
  const renderer = parcelRenderer(targetMap);
  const loaded = {};   // file -> L.GeoJSON (or 'loading')
  const labels = L.layerGroup().addTo(layerGroup);
  let index = [];
  const refreshLabels = () => {
    labels.clearLayers();
    if (!targetMap.hasLayer(layerGroup) || targetMap.getZoom() < CADASTRAL_LABEL_MIN_ZOOM) return;
    const view = targetMap.getBounds().pad(0.1);
    Object.values(loaded).forEach(layer => {
      if (layer === 'loading') return;
      layer.eachLayer(l => {
        const p = l.feature.properties;
        const text = p.m && p.m !== '0' && p.k ? p.m + '//' + p.k : (p.k || '');
        if (!text || !view.contains([p.lat, p.lng])) return;
        L.marker([p.lat, p.lng], { interactive: false, keyboard: false, pmIgnore: true, snapIgnore: true, icon: L.divIcon({ className: 'khasra-label', html: '<span>' + escapeLabel(text) + '</span>', iconSize: null }) }).addTo(labels);
      });
    });
  };
  const refresh = () => {
    if (!targetMap.hasLayer(layerGroup) || targetMap.getZoom() < CADASTRAL_MIN_ZOOM) { labels.clearLayers(); return; }
    const view = targetMap.getBounds();
    index.forEach(v => {
      if (loaded[v.file] || !view.intersects([[v.bbox[1], v.bbox[0]], [v.bbox[3], v.bbox[2]]])) return;
      loaded[v.file] = 'loading';
      fetch(group.cadastral + v.file).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(data => {
        loaded[v.file] = L.geoJSON(data, {
          renderer, interactive: !passive, pmIgnore: true, snapIgnore: true,
          style: { color: group.color, weight: 1, fillColor: group.color, fillOpacity: 0.04 },
          onEachFeature: passive ? null : (f, layer) => layer.bindPopup(() => cadastralPopupHtml(f.properties), { maxWidth: 320 })
        }).addTo(layerGroup);
        refreshLabels();
      }).catch(err => { delete loaded[v.file]; console.warn('Cadastral load failed for ' + v.file, err); });
    });
    refreshLabels();
  };
  fetch(group.cadastral + 'index.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(list => {
    index = list;
    targetMap.on('zoomend moveend', refresh);
    layerGroup.on('add', refresh);
    refresh();
  }).catch(err => console.warn('Cadastral index load failed', err));
}
// 1 kanal = 20 marla, 1 marla = 9 sq. karam (Haryana revenue units).
function kanalMarla(karam) {
  if (!(karam > 0)) return '';
  const marla = karam / 9;
  return Math.floor(marla / 20) + ' K ' + (marla % 20).toFixed(1) + ' M';
}
function landPopupHtml(p) {
  const rows = [['Village', p.VILL_NAME], ['Hadbast No.', p.HADBAST_NO], ['Murabba // Khasra', p.label], ['Type', p.POLY_TYPE],
    ['Category', p.Categories], ['Status', p.P_status], ['Area', p.AREA_METER ? Number(p.AREA_METER).toLocaleString('en-IN') + ' m² (' + (p.AREA_METER / 4046.86).toFixed(3) + ' acre)' : ''],
    ['Kanal-Marla', kanalMarla(p.AREA_KARAM)], ['Tehsil', p.TEH_NAME]];
  return '<b>Khasra ' + escapeLabel(p.label || '') + '</b><table class="land-popup">' +
    rows.filter(r => r[1]).map(r => '<tr><th>' + r[0] + '</th><td>' + escapeLabel(r[1]) + '</td></tr>').join('') + '</table>' +
    '<div class="land-popup-src">Source: GMDA OneMap</div>';
}
// Land parcels: canvas-rendered polygons; encroachment parcels outlined red. Khasra labels are drawn only
// when zoomed in, and only for parcels in view, so thousands of labels never pile up.
// One canvas renderer per map for both parcel layers, in a pane above the KML overlays: otherwise the filled
// boundary/ward polygons (and a second canvas) sit on top and swallow clicks meant for parcels.
function parcelRenderer(targetMap) {
  if (!targetMap._parcelRenderer) {
    targetMap.createPane('parcelPane').style.zIndex = 450;
    targetMap._parcelRenderer = L.canvas({ padding: 0.5, pane: 'parcelPane' });
  }
  return targetMap._parcelRenderer;
}
function loadLandParcels(targetMap, group, layerGroup, passive) {
  fetch(group.geojson).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(data => {
    const renderer = parcelRenderer(targetMap);
    const parcels = L.geoJSON(data, {
      renderer, interactive: !passive, pmIgnore: true, snapIgnore: true,
      style: f => /encroach/i.test(f.properties.P_status || '')
        ? { color: '#ff1744', weight: 2, fillColor: '#ff1744', fillOpacity: 0.18 }
        : { color: group.color, weight: 1, fillColor: group.color, fillOpacity: 0.06 },
      onEachFeature: passive ? null : (f, layer) => layer.bindPopup(() => landPopupHtml(f.properties), { maxWidth: 320 })
    }).addTo(layerGroup);
    const labels = L.layerGroup().addTo(layerGroup);
    const refreshLabels = () => {
      labels.clearLayers();
      if (!targetMap.hasLayer(layerGroup) || targetMap.getZoom() < KHASRA_LABEL_MIN_ZOOM) return;
      const view = targetMap.getBounds().pad(0.1);
      data.features.forEach(f => {
        const p = f.properties;
        if (!p.label || !view.contains([p.labelLat, p.labelLng])) return;
        L.marker([p.labelLat, p.labelLng], { interactive: false, keyboard: false, pmIgnore: true, snapIgnore: true, icon: L.divIcon({ className: 'khasra-label', html: '<span>' + escapeLabel(p.label) + '</span>', iconSize: null }) }).addTo(labels);
      });
    };
    targetMap.on('zoomend moveend', refreshLabels);
    layerGroup.on('add', refreshLabels);
    refreshLabels();
    return parcels;
  }).catch(err => console.warn('Land layer load failed for ' + group.geojson, err));
}
// Ward number at the point deepest inside each ward (precomputed into the KML as labelLat/labelLng).
function escapeLabel(text) { return String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
// Area labels at the precomputed point inside each area: ward numbers ("Ward 5") and village names.
function addAreaLabels(kmlLayer, layerGroup, group) {
  kmlLayer.eachLayer(layer => {
    const p = (layer.feature && layer.feature.properties) || {};
    const text = group.wardLabels ? (p.ward ? 'Ward ' + p.ward : '') : (p.name || '');
    if (!text) return;
    const at = p.labelLat && p.labelLng ? [Number(p.labelLat), Number(p.labelLng)] : layer.getBounds().getCenter();
    L.marker(at, { interactive: false, keyboard: false, pmIgnore: true, snapIgnore: true, icon: L.divIcon({ className: group.wardLabels ? 'ward-label' : 'village-label', html: '<span>' + escapeLabel(text) + '</span>', iconSize: null }) }).addTo(layerGroup);
  });
}
// passive: for the marking map - the layers ignore clicks (so they never block drawing) and the Geoman editing/snapping tools.
// Only the Municipal Boundary (needed to fit the map) is fetched up front; every other KML is fetched the first time its layer is switched on.
function loadMunicipalLayers(targetMap, layerPanel, onBoundaryReady, autoAdd = true, passive = false) {
  const groupLayers = {};
  KML_LAYERS.forEach(group => {
    const layerGroup = L.layerGroup();
    const fetchFiles = group.cadastral ? () => loadCadastral(targetMap, group, layerGroup, passive)
      : group.geojson ? () => loadLandParcels(targetMap, group, layerGroup, passive) : () => group.files.forEach(file => {
      omnivore.kml(file)
        .on('ready', function () {
          this.eachLayer(layer => {
            if (passive) Object.assign(layer.options, { interactive: false, pmIgnore: true, snapIgnore: true });
            if (layer.setStyle) layer.setStyle({ color: group.color, weight: group.wardLabels ? 2 : 3, fillOpacity: group.wardLabels ? 0 : 0.04, dashArray: group.wardLabels ? '6,4' : null });
          });
          this.addTo(layerGroup);
          if (group.wardLabels || group.nameLabels) addAreaLabels(this, layerGroup, group);
          if (group.name === 'Municipal Boundary' && onBoundaryReady) onBoundaryReady(this);
        })
        .on('error', () => console.warn('KML load failed for ' + file));
    });
    if (group.name === 'Municipal Boundary') fetchFiles(); else layerGroup.once('add', fetchFiles);
    groupLayers[group.name] = layerGroup;
    if (autoAdd && group.show) layerGroup.addTo(targetMap);
  });
  if (layerPanel) {
    // OneMap-style floating layer list: a "Layers" button on the map opens a panel of collapsible groups;
    // a group's checkbox switches all its layers.
    const LayerPanel = L.Control.extend({
      options: { position: 'topright' },
      onAdd() {
        const div = L.DomUtil.create('div', 'layer-panel-control');
        div.innerHTML = '<button type="button" class="layer-panel-btn" aria-expanded="false" title="Map layers">&#9776; Layers <span class="layer-panel-count"></span></button>' +
          '<div class="layer-panel" hidden><div class="layer-panel-head"><span>Map layers</span><button type="button" class="layer-panel-close" aria-label="Close layers">&#10005;</button></div><div class="layer-panel-body"></div></div>';
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);
        return div;
      }
    });
    const control = new LayerPanel().addTo(targetMap);
    const legend = control.getContainer();
    const btn = legend.querySelector('.layer-panel-btn'), panel = legend.querySelector('.layer-panel');
    const item = group => '<label class="dropdown-check-item layer-tree-item"><input type="checkbox" data-kml-group="' + escapeLabel(group.name) + '"' + (group.show ? ' checked' : '') + '><span class="legend-swatch" style="background:' + group.color + '"></span> ' + escapeLabel(group.name) + '</label>';
    legend.querySelector('.layer-panel-body').innerHTML = KML_LAYER_CATEGORIES.map(cat => '<div class="layer-cat"><div class="layer-cat-head"><button type="button" class="layer-cat-twisty" aria-expanded="true" title="Show/hide layers">&#9662;</button>' +
        '<label><input type="checkbox" data-kml-cat="' + escapeLabel(cat) + '"> ' + escapeLabel(cat) + '</label></div>' +
        '<div class="layer-cat-body">' + KML_LAYERS.filter(g => g.category === cat).map(item).join('') + '</div></div>').join('');
    const layerBoxes = [...legend.querySelectorAll('[data-kml-group]')];
    const syncState = () => {
      legend.querySelectorAll('[data-kml-cat]').forEach(catBox => {
        const boxes = [...catBox.closest('.layer-cat').querySelectorAll('[data-kml-group]')];
        const on = boxes.filter(b => b.checked).length;
        catBox.checked = on === boxes.length; catBox.indeterminate = on > 0 && on < boxes.length;
      });
      legend.querySelector('.layer-panel-count').textContent = layerBoxes.filter(b => b.checked).length + '/' + layerBoxes.length;
    };
    const apply = input => {
      const layer = groupLayers[input.dataset.kmlGroup];
      if (input.checked) layer.addTo(targetMap); else targetMap.removeLayer(layer);
    };
    layerBoxes.forEach(input => input.addEventListener('change', () => { apply(input); syncState(); }));
    legend.querySelectorAll('[data-kml-cat]').forEach(catBox => catBox.addEventListener('change', () => {
      catBox.closest('.layer-cat').querySelectorAll('[data-kml-group]').forEach(b => { if (b.checked !== catBox.checked) { b.checked = catBox.checked; apply(b); } });
      syncState();
    }));
    legend.querySelectorAll('.layer-cat-twisty').forEach(twisty => twisty.addEventListener('click', () => {
      const open = twisty.getAttribute('aria-expanded') !== 'true';
      twisty.setAttribute('aria-expanded', String(open));
      twisty.closest('.layer-cat').querySelector('.layer-cat-body').hidden = !open;
    }));
    // Stays open while you work (like OneMap); closed with the button or the X.
    const fitPanel = () => { legend.querySelector('.layer-panel-body').style.maxHeight = Math.max(160, targetMap.getSize().y - 80) + 'px'; };
    const setOpen = open => { if (open) fitPanel(); panel.hidden = !open; btn.hidden = open; btn.setAttribute('aria-expanded', String(open)); };
    targetMap.on('resize', fitPanel);
    btn.addEventListener('click', () => setOpen(true));
    legend.querySelector('.layer-panel-close').addEventListener('click', () => setOpen(false));
    syncState();
  }
  return groupLayers;
}
