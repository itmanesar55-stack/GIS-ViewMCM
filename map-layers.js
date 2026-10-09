// Generated from the portal index.html by tools/sync_public_view.py - edit index.html, not this file.
// Copied verbatim into the public GitHub Pages view by tools/sync_public_view.py - keep it self-contained
// (only Leaflet, omnivore and DOM APIs) and use relative data paths.
const KML_LAYERS = [
  { name: 'Municipal Boundary', category: 'Boundaries', color: '#e6194b', show: true, files: ['FINALMCM.kml'] },
  { name: 'Authorized Colonies', category: 'Colonies & Infrastructure', color: '#0072b2', show: false, files: ['Bhangrola_B-7954.kml', 'Wazirpur_Enclave_B-44.kml', 'Saheed_Bagat_Singh_Colony.kml'] },
  { name: 'Lal Dora', category: 'Land Records', color: '#f58231', show: false, files: ['ManesarLalDora.kml'] },
  { name: 'Zones', category: 'Boundaries', color: '#911eb4', show: false, files: ['MCM_ZONE_KML.kml'] },
  { name: 'Village Boundary', category: 'Boundaries', color: '#3cb44b', show: false, files: ['village_boundary.kml'], nameLabels: true },
  { name: 'Roads (MCM)', category: 'Colonies & Infrastructure', color: '#333333', show: false, files: ['Municipal_Corporation_Manesar.kml'] },
  // All roads from GMDA OneMap ("Roads Under MC Manesar"), one sub-layer per road type, from tools/import_roads_kml.py.
  { name: 'Roads (All)', category: 'Colonies & Infrastructure', color: 'linear-gradient(90deg, #4ce600 25%, #ff00c5 25% 50%, #00c5ff 50% 75%, #ffaa00 75%)', show: false,
    groupLayer: 'layers/MCM_Roads_All.geojson', legend: true },
  { name: 'Ward Boundaries', category: 'Boundaries', color: '#ffd400', show: true, files: ['MCM_Wards.kml'], wardLabels: true },
  // Khasra-level land parcels from GMDA OneMap (rebuilt by tools/export_gmda_mcm.py).
  { name: 'MCM Land (Khasra)', category: 'Land Records', color: '#00e5ff', show: false, geojson: 'MCM_Land.geojson' },
  // All-village cadastral parcels, one file per village (tools/export_gmda_cadastral.py); fetched per village as you zoom in.
  { name: 'Cadastral - All Villages (zoom in)', category: 'Land Records', color: '#ffeb3b', show: false, cadastral: 'cadastral/' },
  // GMDA Master Plan land use with OneMap's class colours (tools/export_gmda_masterplan.py).
  { name: 'GMDA Master Plan', category: 'Planning', color: 'linear-gradient(90deg, #ffff00 33%, #e69a00 33% 66%, #97dbf1 66%)', show: false,
    masterPlan: 'layers/GMDA_Master_Plan.geojson', legend: true },
  // A whole OneMap group (several sub-layers, each with its own style), from tools/export_gmda_group.py --portal.
  { name: 'Sultanpur CLU', category: 'Planning', color: 'linear-gradient(90deg, #00a9e6 50%, #ffbebe 50%)', show: false,
    groupLayer: 'layers/Sultanpur_CLU.geojson', legend: true },
  // Proposed metro Sector 56 - Panchgaon (CAD alignment KMZ of 16-09-2024), from tools/import_metro_kmz.py.
  { name: 'Metro Alignment (Sec 56 - Panchgaon)', category: 'Planning', color: 'linear-gradient(90deg, #e6007e 60%, #00e676 60%)', show: false,
    groupLayer: 'layers/Metro_Sector56_Panchgaon.geojson', legend: true }
];
// Order of the groups in the layer dropdown (like OneMap's layer list).
const KML_LAYER_CATEGORIES = ['Boundaries', 'Planning', 'Land Records', 'Colonies & Infrastructure'];
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
const MASTER_PLAN_LABEL_MIN_ZOOM = 14;
// Legend rows for a class-styled layer. OneMap draws some classes with hatch/dot patterns (exported as a lighter
// tint, opacity below 0.5), so those chips get a hatch to tell them apart from the solid classes.
function classLegendHtml(styles, present) {
  const hexA = (hex, a) => 'rgba(' + [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',') + ',' + a + ')';
  return Object.keys(styles).filter(k => !present || present.has(k)).sort((a, b) => Number(a) - Number(b)).map(k => {
    const st = styles[k];
    const bg = !st.fillColor ? '#fff'
      : st.fillOpacity >= 0.5 ? hexA(st.fillColor, 0.75)
      : 'repeating-linear-gradient(45deg, ' + st.fillColor + ' 0 2px, ' + hexA(st.fillColor, 0.18) + ' 2px 5px)';
    return '<div class="class-legend-row"><span class="class-legend-chip" style="background:' + bg + ';border-color:' + (st.color || '#888') + '"></span>' + escapeLabel(st.label || k) + '</div>';
  }).join('');
}
function masterPlanPopupHtml(p, style) {
  const rows = [['Sector', p.sector], ['Land use', p.classtext || (style && style.label)], ['Density (PPH)', p.density], ['Code', p.val || p.code],
    ['Note', p.codetext], ['Area', p.area ? (p.area / 10000).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' ha (' + (p.area / 4046.86).toLocaleString('en-IN', { maximumFractionDigits: 1 }) + ' acre)' : '']];
  const chip = style && style.fillColor ? '<span class="plan-chip" style="background:' + style.fillColor + '"></span>' : '';
  return '<b>' + chip + escapeLabel(p.sector ? 'Sector ' + p.sector : (p.classtext || 'Master Plan')) + '</b><table class="land-popup">' +
    rows.filter(r => r[1]).map(r => '<tr><th>' + r[0] + '</th><td>' + escapeLabel(r[1]) + '</td></tr>').join('') + '</table>' +
    '<div class="land-popup-src">Source: GMDA OneMap Master Plan</div>';
}
// Master plan: one polygon per land-use zone, coloured per class from the "styles" in the file (OneMap's legend
// colours). Shares the parcel canvas so clicks reach it, but is kept underneath the khasra parcels.
// ---- OneMap group layers: an index file lists the sub-layers (name, file, default visibility, styles, legend
// swatches); each sub-layer file is fetched the first time it is shown. Sub-layer on/off state lives on the group
// (group.subVisible) so the layer panel can change it before or after the layer is first loaded.
const GROUP_LABEL_MIN_ZOOM = 16, GROUP_LABEL_MAX = 400;
function groupIndex(group) {
  if (!group._index) group._index = fetch(group.groupLayer).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(index => { group.subVisible = group.subVisible || Object.fromEntries(index.sublayers.map(sl => [sl.id, sl.visible])); return index; })
    .catch(err => { delete group._index; throw err; });
  return group._index;
}
function groupPopupHtml(sub, p) {
  const rows = Object.entries(p).filter(([k, v]) => !k.startsWith('_') && v !== null && v !== '' && String(v).trim() !== '');
  return '<b>' + escapeLabel(p._l || sub.name) + '</b><div class="land-popup-src" style="margin:0 0 4px">' + escapeLabel(sub.name) + '</div><table class="land-popup">' +
    rows.map(([k, v]) => '<tr><th>' + escapeLabel(k) + '</th><td>' + escapeLabel(typeof v === 'number' ? +v.toFixed(4) : v) + '</td></tr>').join('') + '</table>' +
    '<div class="land-popup-src">Source: ' + escapeLabel(sub.source || 'GMDA OneMap') + '</div>';
}
function loadGroupLayer(targetMap, group, layerGroup, passive) {
  groupIndex(group).then(index => {
    const subs = {};   // id -> { layerGroup, data, geo }
    const order = index.sublayers.map(sl => sl.id);   // first in the list is drawn on top (as on OneMap)
    const restack = () => order.slice().reverse().forEach(id => { const s = subs[id]; if (s && s.geo && targetMap.hasLayer(s.layerGroup)) s.geo.eachLayer(l => l.bringToFront && l.bringToFront()); });
    const labels = L.layerGroup().addTo(layerGroup);
    const refreshLabels = () => {
      labels.clearLayers();
      if (!targetMap.hasLayer(layerGroup)) return;
      const view = targetMap.getBounds().pad(0.05);
      let n = 0;
      index.sublayers.forEach(sl => {
        const s = subs[sl.id];
        if (!s || !s.data || !targetMap.hasLayer(s.layerGroup) || targetMap.getZoom() < (sl.labelMinZoom || GROUP_LABEL_MIN_ZOOM)) return;
        s.data.features.forEach(f => {
          const p = f.properties;
          if (n >= GROUP_LABEL_MAX || !p._l || p._lat === undefined || !view.contains([p._lat, p._lng])) return;
          n++;
          L.marker([p._lat, p._lng], { interactive: false, keyboard: false, pmIgnore: true, snapIgnore: true, icon: L.divIcon({ className: 'plan-label', html: '<span>' + escapeLabel(p._l) + '</span>', iconSize: null }) }).addTo(labels);
        });
      });
    };
    index.sublayers.forEach(sl => {
      const sub = subs[sl.id] = { layerGroup: L.layerGroup() };
      sub.layerGroup.once('add', () => fetch(new URL(sl.file, new URL(group.groupLayer, location.href))).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(data => {
        sub.data = data;
        sub.geo = L.geoJSON(data, {
          renderer: parcelRenderer(targetMap), interactive: !passive, pmIgnore: true, snapIgnore: true,
          style: f => sl.styles[f.properties._s] || {},
          pointToLayer: (f, latlng) => {
            const st = sl.styles[f.properties._s] || {};
            return st.icon ? L.marker(latlng, { interactive: !passive, pmIgnore: true, snapIgnore: true, icon: L.icon({ iconUrl: st.icon, iconSize: [st.size, st.size] }) })
              : L.circleMarker(latlng, { renderer: parcelRenderer(targetMap), radius: 5 });
          },
          onEachFeature: passive ? null : (f, layer) => layer.bindPopup(() => groupPopupHtml(sl, f.properties), { maxWidth: 320 })
        }).addTo(sub.layerGroup);
        restack(); refreshLabels();
      }).catch(err => console.warn('Group sub-layer load failed: ' + sl.file, err)));
      if (group.subVisible[sl.id]) sub.layerGroup.addTo(layerGroup);
    });
    // The layer panel switches sub-layers through this hook.
    (group._setSub = group._setSub || {})[L.stamp(targetMap)] = (id, on) => {
      const s = subs[id]; if (!s) return;
      if (on) { s.layerGroup.addTo(layerGroup); setTimeout(restack); } else layerGroup.removeLayer(s.layerGroup);
      refreshLabels();
    };
    targetMap.on('zoomend moveend', refreshLabels);
    layerGroup.on('add', () => setTimeout(() => { restack(); refreshLabels(); }));
  }).catch(err => console.warn('Group layer index load failed for ' + group.groupLayer, err));
}
function groupLegendHtml(index) {
  return index.sublayers.map(sl => '<div class="group-legend-title">' + escapeLabel(sl.name) + '</div>' +
    sl.legend.map(e => '<div class="class-legend-row"><img class="group-legend-swatch" src="' + e.swatch + '" alt="">' + escapeLabel(e.label === sl.name ? '' : e.label) + '</div>').join('')).join('');
}
function loadMasterPlan(targetMap, group, layerGroup, passive) {
  fetch(group.masterPlan).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(data => {
    const styles = data.styles || {};
    const zones = L.geoJSON(data, {
      renderer: parcelRenderer(targetMap), interactive: !passive, pmIgnore: true, snapIgnore: true,
      style: f => {
        const st = styles[f.properties.class] || {};
        return { color: st.color || '#555', opacity: 0.6, weight: 1, fill: !!st.fillColor, fillColor: st.fillColor || '#fff', fillOpacity: st.fillColor ? st.fillOpacity : 0 };
      },
      onEachFeature: passive ? null : (f, layer) => layer.bindPopup(() => masterPlanPopupHtml(f.properties, styles[f.properties.class]), { maxWidth: 320 })
    }).addTo(layerGroup);
    const toBack = () => zones.eachLayer(l => l.bringToBack());
    toBack();
    layerGroup.on('add', () => setTimeout(toBack));
    const labels = L.layerGroup().addTo(layerGroup);
    const refreshLabels = () => {
      labels.clearLayers();
      if (!targetMap.hasLayer(layerGroup) || targetMap.getZoom() < MASTER_PLAN_LABEL_MIN_ZOOM) return;
      const view = targetMap.getBounds().pad(0.1);
      data.features.forEach(f => {
        const p = f.properties;   // OneMap labels each zone with its density
        if (!p.density || !view.contains([p.labelLat, p.labelLng])) return;
        L.marker([p.labelLat, p.labelLng], { interactive: false, keyboard: false, pmIgnore: true, snapIgnore: true, icon: L.divIcon({ className: 'plan-label', html: '<span>' + escapeLabel(p.density) + '</span>', iconSize: null }) }).addTo(labels);
      });
    };
    targetMap.on('zoomend moveend', refreshLabels);
    layerGroup.on('add', refreshLabels);
    refreshLabels();
  }).catch(err => console.warn('Master plan load failed for ' + group.masterPlan, err));
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
  // The public GitHub Pages view sets window.PUBLIC_VIEW; portal-only layers (e.g. the master plan) are left out there.
  const layers = KML_LAYERS.filter(g => !(window.PUBLIC_VIEW && g.portalOnly));
  layers.forEach(group => {
    const layerGroup = L.layerGroup();
    const fetchFiles = group.groupLayer ? () => loadGroupLayer(targetMap, group, layerGroup, passive)
      : group.masterPlan ? () => loadMasterPlan(targetMap, group, layerGroup, passive)
      : group.cadastral ? () => loadCadastral(targetMap, group, layerGroup, passive)
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
    // A layer with a legend image gets a small "Legend" toggle under it (e.g. the master plan's land-use classes).
    const item = group => '<label class="dropdown-check-item layer-tree-item"><input type="checkbox" data-kml-group="' + escapeLabel(group.name) + '"' + (group.show ? ' checked' : '') + '><span class="legend-swatch" style="background:' + group.color + '"></span> ' + escapeLabel(group.name) + '</label>' +
      (group.groupLayer ? '<button type="button" class="layer-legend-toggle layer-sub-toggle" aria-expanded="false" data-sub-toggle="' + escapeLabel(group.name) + '">Sub-layers <span class="layer-sub-count"></span> &#9662;</button>' +
        '<div class="layer-sublist" data-sub-for="' + escapeLabel(group.name) + '" hidden></div>' : '') +
      (group.legend ? '<button type="button" class="layer-legend-toggle" aria-expanded="false" data-legend-for="' + escapeLabel(group.name) + '">Legend &#9662;</button><div class="layer-legend" hidden></div>' : '');
    legend.querySelector('.layer-panel-body').innerHTML = KML_LAYER_CATEGORIES.filter(cat => layers.some(g => g.category === cat)).map(cat => '<div class="layer-cat"><div class="layer-cat-head"><button type="button" class="layer-cat-twisty" aria-expanded="true" title="Show/hide layers">&#9662;</button>' +
        '<label><input type="checkbox" data-kml-cat="' + escapeLabel(cat) + '"> ' + escapeLabel(cat) + '</label></div>' +
        '<div class="layer-cat-body">' + layers.filter(g => g.category === cat).map(item).join('') + '</div></div>').join('');
    const layerBoxes = [...legend.querySelectorAll('[data-kml-group]')];
    // Group layers list their sub-layers (OneMap-style) with their own checkboxes; ticking one also shows the group.
    legend.querySelectorAll('.layer-sublist').forEach(box => {
      const group = layers.find(g => g.name === box.dataset.subFor);
      groupIndex(group).then(index => {
        box.innerHTML = index.sublayers.map(sl => '<label class="layer-sub-item"><input type="checkbox" data-sub-layer="' + sl.id + '"' + (group.subVisible[sl.id] ? ' checked' : '') + '>' +
          (sl.legend.length === 1 ? '<img class="group-legend-swatch" src="' + sl.legend[0].swatch + '" alt="">' : '<span class="group-legend-swatch multi"></span>') +
          '<span>' + escapeLabel(sl.name) + ' <small>(' + sl.count.toLocaleString('en-IN') + ')</small></span></label>').join('');
        const toggle = box.previousElementSibling;
        const updateCount = () => { toggle.querySelector('.layer-sub-count').textContent = '(' + Object.values(group.subVisible).filter(Boolean).length + ' of ' + index.sublayers.length + ' on)'; };
        updateCount();
        box.querySelectorAll('[data-sub-layer]').forEach(cb => cb.addEventListener('change', () => {
          const id = Number(cb.dataset.subLayer);
          group.subVisible[id] = cb.checked;
          updateCount();
          const parent = legend.querySelector('[data-kml-group="' + CSS.escape(group.name) + '"]');
          if (cb.checked && !parent.checked) { parent.checked = true; apply(parent); syncState(); }
          const hook = group._setSub && group._setSub[L.stamp(targetMap)];
          if (hook) hook(id, cb.checked);
        }));
      }).catch(() => { box.textContent = 'Sub-layers unavailable'; });
    });
    legend.querySelectorAll('.layer-sub-toggle').forEach(toggle => toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.nextElementSibling.hidden = !open;
    }));
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
    legend.querySelectorAll('.layer-legend-toggle:not(.layer-sub-toggle)').forEach(toggle => toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      const box = toggle.nextElementSibling;
      box.hidden = !open;
      if (open && !box.dataset.built) {
        box.dataset.built = '1';
        const group = layers.find(g => g.name === toggle.dataset.legendFor);
        box.textContent = 'Loading...';
        (group.groupLayer ? groupIndex(group).then(index => { box.innerHTML = groupLegendHtml(index); })
          : fetch(group.masterPlan).then(r => r.json()).then(data => { box.innerHTML = classLegendHtml(data.styles || {}, new Set(data.features.map(f => f.properties.class))); }))
          .catch(() => { box.textContent = 'Legend unavailable'; delete box.dataset.built; });
      }
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
