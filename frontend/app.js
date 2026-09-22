/**
 * Geo-Semantic Earth Observation - Frontend Engine (100% Offline MVP)
 */

document.addEventListener("DOMContentLoaded", () => {
  // State Management
  const state = {
    activeTab: "search-tab",
    searchResults: [],
    changeCandidates: [],
    reviewItems: [],
    selectedEventId: null,
    selectedTileId: null,
    clustersData: null,
    mapBounds: [72.8, 18.9, 73.0, 19.1], // Default Mumbai AOI [minx, miny, maxx, maxy]
    selectedItemForSwipe: null,
  };

  // DOM Elements
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  const searchInput = document.getElementById("search-input");
  const btnSearch = document.getElementById("btn-search");
  const searchResultsList = document.getElementById("search-results-list");
  const searchCount = document.getElementById("search-count");
  const quickChips = document.querySelectorAll(".quick-chips .chip");
  
  // Change Tab Elements
  const btnRunChange = document.getElementById("btn-run-change");
  const t1DateInput = document.getElementById("t1-date-input");
  const t2DateInput = document.getElementById("t2-date-input");
  const driftSlider = document.getElementById("drift-slider");
  const driftVal = document.getElementById("drift-val");
  const changeCandList = document.getElementById("change-candidates-list");
  const changeCandCount = document.getElementById("change-cand-count");
  
  // Split Viewer Elements
  const splitViewer = document.getElementById("split-viewer");
  const sliderHandle = document.getElementById("slider-handle");
  const layerAfterWrap = document.getElementById("layer-after-wrap");
  const imgBefore = document.getElementById("img-before");
  const imgAfter = document.getElementById("img-after");
  const swipeCategoryTag = document.getElementById("swipe-category-tag");
  const swipeConfidence = document.getElementById("swipe-confidence");
  const swipeDrift = document.getElementById("swipe-drift");
  const swipeQa = document.getElementById("swipe-qa");
  const labelT1Date = document.getElementById("label-t1-date");
  const labelT2Date = document.getElementById("label-t2-date");
  const btnConfirmSwipe = document.getElementById("btn-confirm-swipe");
  const btnRejectSwipe = document.getElementById("btn-reject-swipe");
  const provSensor = document.getElementById("prov-sensor");
  const provDates = document.getElementById("prov-dates");
  const provModel = document.getElementById("prov-model");

  // Review Queue Elements
  const queueTbody = document.getElementById("queue-tbody");
  const queueBadge = document.getElementById("queue-badge");
  const btnRefreshQueue = document.getElementById("btn-refresh-queue");
  const filterButtons = document.querySelectorAll(".filter-btn");

  // Discovery Tab Elements
  const btnRunCluster = document.getElementById("btn-run-cluster");
  const kClustersSlider = document.getElementById("k-clusters");
  const kClustersVal = document.getElementById("k-clusters-val");
  const clusterMethod = document.getElementById("cluster-method");
  const clusterSummaryList = document.getElementById("cluster-summary-list");
  const scatterCanvas = document.getElementById("scatter-canvas");
  const scatterTooltip = document.getElementById("scatter-tooltip");

  // Modal Elements
  const provModal = document.getElementById("provenance-modal");
  const btnCloseModal = document.getElementById("btn-close-modal");
  const modalProvContent = document.getElementById("modal-prov-content");

  // 1. Tab Switching Logic
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      switchTab(targetTab);
    });
  });

  function switchTab(tabId) {
    state.activeTab = tabId;
    tabButtons.forEach(b => b.classList.toggle("active", b.getAttribute("data-tab") === tabId));
    tabContents.forEach(c => c.classList.toggle("active", c.id === tabId));

    if (tabId === "review-tab") {
      loadReviewQueue();
    } else if (tabId === "discovery-tab" && !state.clustersData) {
      loadClusters();
    } else if (tabId === "search-tab") {
      renderMap();
    }
  }

  // 2. Interactive Offline Map Canvas
  const mapDiv = document.getElementById("map");
  let canvasMap = null;

  function initMapCanvas() {
    mapDiv.innerHTML = `<canvas id="geo-canvas" style="width:100%;height:100%;background:#090d16;display:block;"></canvas>`;
    canvasMap = document.getElementById("geo-canvas");
    const resize = () => {
      canvasMap.width = mapDiv.clientWidth;
      canvasMap.height = mapDiv.clientHeight;
      renderMap();
    };
    window.addEventListener("resize", resize);
    resize();
  }

  function renderMap() {
    if (!canvasMap) return;
    const ctx = canvasMap.getContext("2d");
    const w = canvasMap.width;
    const h = canvasMap.height;

    ctx.clearRect(0, 0, w, h);

    // Draw Dark Grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Coordinates overlay
    ctx.fillStyle = "#334155";
    ctx.font = "10px JetBrains Mono";
    ctx.fillText("CRS: EPSG:4326 | Satellite AOI: 19.0760° N, 72.8777° E", 16, 24);

    // Draw Bounding Boxes from Search Results or Change Candidates
    const items = state.searchResults.length > 0 ? state.searchResults : state.changeCandidates;
    
    if (items.length === 0) {
      // Draw baseline scene frame
      ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(w * 0.15, h * 0.15, w * 0.7, h * 0.7);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(59, 130, 246, 0.05)";
      ctx.fillRect(w * 0.15, h * 0.15, w * 0.7, h * 0.7);
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("Active GeoTIFF Coverage Footprint (Indexed Scene)", w * 0.15 + 12, h * 0.15 + 24);
      return;
    }

    const gridCols = Math.ceil(Math.sqrt(items.length));
    const gridRows = Math.ceil(items.length / gridCols);
    const boxW = (w * 0.7) / gridCols;
    const boxH = (h * 0.7) / gridRows;
    const startX = w * 0.15;
    const startY = h * 0.15;

    items.forEach((item, idx) => {
      const col = idx % gridCols;
      const row = Math.floor(idx / gridCols);
      const bx = startX + col * boxW;
      const by = startY + row * boxH;

      const score = item.score || item.confidence || 0.5;
      let strokeColor = "#3b82f6";
      let fillColor = "rgba(59, 130, 246, 0.1)";

      if (score >= 0.7) {
        strokeColor = "#10b981";
        fillColor = "rgba(16, 185, 129, 0.2)";
      } else if (score >= 0.4) {
        strokeColor = "#f59e0b";
        fillColor = "rgba(245, 158, 11, 0.15)";
      }

      if (item.category) {
        strokeColor = "#ef4444";
        fillColor = "rgba(239, 68, 68, 0.25)";
      }

      ctx.fillStyle = fillColor;
      ctx.fillRect(bx + 4, by + 4, boxW - 8, boxH - 8);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = (state.selectedTileId === item.tile_id) ? 3 : 1.5;
      ctx.strokeRect(bx + 4, by + 4, boxW - 8, boxH - 8);

      // Label
      ctx.fillStyle = "#ffffff";
      ctx.font = "11px Inter, sans-serif";
      const lbl = item.category || `Score: ${(score * 100).toFixed(0)}%`;
      ctx.fillText(lbl, bx + 8, by + 20);
    });
  }

  initMapCanvas();

  // 3. Semantic Search Handler
  btnSearch.addEventListener("click", () => executeSearch(searchInput.value));
  searchInput.addEventListener("keydown", (e) => { if (e.key === "Enter") executeSearch(searchInput.value); });
  
  quickChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const q = chip.getAttribute("data-query");
      searchInput.value = q;
      executeSearch(q);
    });
  });

  async function executeSearch(query) {
    if (!query || !query.trim()) return;
    btnSearch.textContent = "Searching...";
    btnSearch.disabled = true;

    try {
      const resp = await fetch("/api/v1/search/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), top_k: 12 }),
      });
      const data = await resp.json();
      state.searchResults = data.results || [];
      renderSearchResults();
      renderMap();
    } catch (err) {
      console.error("Search error:", err);
      searchResultsList.innerHTML = `<div class="empty-state text-danger">Search failed: ${err.message}</div>`;
    } finally {
      btnSearch.textContent = "Search";
      btnSearch.disabled = false;
    }
  }

  function renderSearchResults() {
    searchCount.textContent = `${state.searchResults.length} hits`;
    if (state.searchResults.length === 0) {
      searchResultsList.innerHTML = `<div class="empty-state">No matching satellite tiles found.</div>`;
      return;
    }

    searchResultsList.innerHTML = state.searchResults.map((item, idx) => `
      <div class="result-item ${state.selectedTileId === item.tile_id ? 'selected' : ''}" data-idx="${idx}">
        <img class="result-thumb" src="/api/v1/tiles/${item.tile_id}/preview.png" onerror="this.src='/placeholder.png'" alt="Tile" />
        <div class="result-info">
          <div class="result-title">${item.tile_id}</div>
          <div class="result-meta">Date: ${item.date} | ${item.sensor}</div>
        </div>
        <div class="score-badge">${(item.score * 100).toFixed(1)}%</div>
      </div>
    `).join("");

    document.querySelectorAll(".result-item").forEach(el => {
      el.addEventListener("click", () => {
        const idx = parseInt(el.getAttribute("data-idx"), 10);
        const hit = state.searchResults[idx];
        state.selectedTileId = hit.tile_id;
        renderSearchResults();
        renderMap();
        loadTileInSplitViewer(hit);
      });
    });
  }

  // 4. Change Detection Trigger & Candidate List
  driftSlider.addEventListener("input", () => {
    driftVal.textContent = parseFloat(driftSlider.value).toFixed(2);
  });

  btnRunChange.addEventListener("click", async () => {
    btnRunChange.textContent = "Running Change Pipeline...";
    btnRunChange.disabled = true;

    try {
      const resp = await fetch("/api/v1/change/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_path_t1: "storage/raw_geotiff/2024-05-15_scene.tif",
          image_path_t2: "storage/raw_geotiff/2024-09-20_scene.tif",
          date_t1: t1DateInput.value,
          date_t2: t2DateInput.value,
          drift_threshold: parseFloat(driftSlider.value),
          enqueue_for_review: true,
        }),
      });
      const data = await resp.json();
      state.changeCandidates = data.candidates || [];
      renderChangeCandidates();
      loadReviewQueue(); // Refresh badge count
      if (state.changeCandidates.length > 0) {
        loadCandidateInSplitViewer(state.changeCandidates[0]);
      }
    } catch (err) {
      console.error("Change detection error:", err);
      changeCandList.innerHTML = `<div class="empty-state text-danger">Detection error: ${err.message}</div>`;
    } finally {
      btnRunChange.textContent = "⚡ Run Change Detection";
      btnRunChange.disabled = false;
    }
  });

  function renderChangeCandidates() {
    changeCandCount.textContent = `${state.changeCandidates.length} detected`;
    if (state.changeCandidates.length === 0) {
      changeCandList.innerHTML = `<div class="empty-state">No significant changes detected at current threshold.</div>`;
      return;
    }

    changeCandList.innerHTML = state.changeCandidates.map((cand, idx) => `
      <div class="result-item ${state.selectedEventId === cand.event_id ? 'selected' : ''}" data-idx="${idx}">
        <img class="result-thumb" src="/api/v1/tiles/${cand.t2_tile_id}/preview.png" alt="After" />
        <div class="result-info">
          <div class="result-title">${cand.category}</div>
          <div class="result-meta">Conf: ${(cand.confidence * 100).toFixed(0)}% | Drift: ${cand.drift.toFixed(3)}</div>
        </div>
        <div class="score-badge" style="background:rgba(239,68,68,0.2);color:#ef4444;">CHANGE</div>
      </div>
    `).join("");

    document.querySelectorAll("#change-candidates-list .result-item").forEach(el => {
      el.addEventListener("click", () => {
        const idx = parseInt(el.getAttribute("data-idx"), 10);
        const cand = state.changeCandidates[idx];
        loadCandidateInSplitViewer(cand);
      });
    });
  }

  // 5. Split-Screen Swipe Viewer Engine
  let isDraggingSlider = false;

  function initSplitSlider() {
    sliderHandle.addEventListener("mousedown", () => { isDraggingSlider = true; });
    window.addEventListener("mouseup", () => { isDraggingSlider = false; });
    window.addEventListener("mousemove", (e) => {
      if (!isDraggingSlider) return;
      const rect = splitViewer.getBoundingClientRect();
      let offsetX = e.clientX - rect.left;
      offsetX = Math.max(0, Math.min(rect.width, offsetX));
      const pct = (offsetX / rect.width) * 100;
      sliderHandle.style.left = `${pct}%`;
      layerAfterWrap.style.width = `${pct}%`;
    });
  }
  initSplitSlider();

  function loadCandidateInSplitViewer(cand) {
    state.selectedItemForSwipe = cand;
    state.selectedEventId = cand.event_id;

    imgBefore.src = `/api/v1/tiles/${cand.t1_tile_id}/preview.png`;
    imgAfter.src = `/api/v1/tiles/${cand.t2_tile_id}/preview.png`;

    swipeCategoryTag.textContent = cand.category || "Change Detected";
    swipeConfidence.textContent = `${(cand.confidence * 100).toFixed(1)}%`;
    swipeDrift.textContent = cand.drift.toFixed(3);
    swipeQa.textContent = cand.cloud_qa_pass ? "PASS" : "FAIL";
    swipeQa.className = cand.cloud_qa_pass ? "text-success" : "text-danger";

    labelT1Date.textContent = t1DateInput.value;
    labelT2Date.textContent = t2DateInput.value;

    const prov = cand.provenance || {};
    provSensor.textContent = prov.sensor || "Sentinel-2 MSI";
    provDates.textContent = `${t1DateInput.value} ➔ ${t2DateInput.value}`;
    provModel.textContent = (prov.model_hash || "sha256:e3b0c442...").substring(0, 18) + "...";

    renderChangeCandidates();
  }

  function loadTileInSplitViewer(hit) {
    switchTab("change-tab");
    imgBefore.src = `/api/v1/tiles/${hit.tile_id}/preview.png`;
    imgAfter.src = `/api/v1/tiles/${hit.tile_id}/preview.png`;

    swipeCategoryTag.textContent = "Semantic Hit: " + (hit.query || "Selected Tile");
    swipeConfidence.textContent = `${(hit.score * 100).toFixed(1)}%`;
    swipeDrift.textContent = "0.000";
    swipeQa.textContent = "PASS";
    labelT1Date.textContent = hit.date || "T1";
    labelT2Date.textContent = hit.date || "T2";
  }

  btnConfirmSwipe.addEventListener("click", async () => {
    if (!state.selectedEventId) return;
    await updateReviewStatus(state.selectedEventId, "CONFIRMED", "Confirmed by Analyst via Swipe Viewer");
    btnConfirmSwipe.textContent = "✓ Confirmed!";
    setTimeout(() => { btnConfirmSwipe.textContent = "✓ Confirm Change"; }, 1500);
  });

  btnRejectSwipe.addEventListener("click", async () => {
    if (!state.selectedEventId) return;
    await updateReviewStatus(state.selectedEventId, "REJECTED", "Marked false alarm / rejected");
    btnRejectSwipe.textContent = "✗ Rejected!";
    setTimeout(() => { btnRejectSwipe.textContent = "✗ Reject / False Alarm"; }, 1500);
  });

  // 6. Analyst Review Queue Engine
  async function loadReviewQueue(statusFilter = "") {
    try {
      const url = statusFilter ? `/api/v1/review/queue?status=${statusFilter}` : "/api/v1/review/queue";
      const resp = await fetch(url);
      const data = await resp.json();
      state.reviewItems = data.items || [];
      queueBadge.textContent = state.reviewItems.filter(i => i.status === "PENDING").length;
      renderReviewQueueTable();
    } catch (err) {
      console.error("Queue load error:", err);
      queueTbody.innerHTML = `<tr><td colspan="9" class="text-danger">Failed to load queue: ${err.message}</td></tr>`;
    }
  }

  function renderReviewQueueTable() {
    if (state.reviewItems.length === 0) {
      queueTbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No review queue items found.</td></tr>`;
      return;
    }

    queueTbody.innerHTML = state.reviewItems.map(item => `
      <tr>
        <td><code>${item.event_id}</code></td>
        <td><strong>${item.change_category}</strong></td>
        <td>
          <span style="font-weight:700;color:${item.confidence > 0.7 ? '#10b981' : '#f59e0b'}">
            ${(item.confidence * 100).toFixed(1)}%
          </span>
        </td>
        <td>${(item.drift_score || 0).toFixed(3)}</td>
        <td><span class="${item.cloud_qa_pass ? 'text-success' : 'text-danger'}">${item.cloud_qa_pass ? '✓ PASS' : '✗ FAIL'}</span></td>
        <td>${item.t_before.date || '-'} ➔ ${item.t_after.date || '-'}</td>
        <td>
          <button class="btn btn-sm btn-secondary btn-prov-modal" data-prov='${JSON.stringify(item.provenance)}'>
            🔍 Hash
          </button>
        </td>
        <td><span class="status-tag ${item.status}">${item.status}</span></td>
        <td>
          <div style="display:flex;gap:4px;">
            <button class="btn btn-sm btn-primary btn-inspect-queue" data-event='${JSON.stringify(item)}'>Inspect</button>
            <button class="btn btn-sm btn-success btn-action-confirm" data-id="${item.event_id}">✓</button>
            <button class="btn btn-sm btn-danger btn-action-reject" data-id="${item.event_id}">✗</button>
          </div>
        </td>
      </tr>
    `).join("");

    // Wire action buttons
    document.querySelectorAll(".btn-prov-modal").forEach(btn => {
      btn.addEventListener("click", () => {
        const prov = JSON.parse(btn.getAttribute("data-prov"));
        showProvenanceModal(prov);
      });
    });

    document.querySelectorAll(".btn-inspect-queue").forEach(btn => {
      btn.addEventListener("click", () => {
        const item = JSON.parse(btn.getAttribute("data-event"));
        switchTab("change-tab");
        loadCandidateInSplitViewer({
          event_id: item.event_id,
          t1_tile_id: item.t_before.tile_id,
          t2_tile_id: item.t_after.tile_id,
          category: item.change_category,
          confidence: item.confidence,
          drift: item.drift_score || 0.2,
          cloud_qa_pass: item.cloud_qa_pass,
          provenance: item.provenance,
        });
      });
    });

    document.querySelectorAll(".btn-action-confirm").forEach(btn => {
      btn.addEventListener("click", () => updateReviewStatus(btn.getAttribute("data-id"), "CONFIRMED"));
    });

    document.querySelectorAll(".btn-action-reject").forEach(btn => {
      btn.addEventListener("click", () => updateReviewStatus(btn.getAttribute("data-id"), "REJECTED"));
    });
  }

  async function updateReviewStatus(eventId, status, remarks = null) {
    try {
      await fetch(`/api/v1/review/queue/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, remarks }),
      });
      loadReviewQueue();
    } catch (err) {
      console.error("Update status error:", err);
    }
  }

  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      loadReviewQueue(btn.getAttribute("data-status"));
    });
  });

  btnRefreshQueue.addEventListener("click", () => loadReviewQueue());

  // 7. Modal Logic
  function showProvenanceModal(prov) {
    modalProvContent.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div><strong>Sensor Name:</strong> ${prov.sensor}</div>
        <div><strong>Acquisition T1:</strong> ${prov.acquisition_date_t1 || 'N/A'}</div>
        <div><strong>Acquisition T2:</strong> ${prov.acquisition_date_t2 || 'N/A'}</div>
        <div><strong>Pipeline Engine:</strong> ${prov.pipeline_version}</div>
        <div><strong>Processed Timestamp:</strong> ${prov.processed_at}</div>
        <div><strong>Model Checkpoint SHA-256:</strong><br><code style="color:#60a5fa;word-break:break-all;">${prov.model_checkpoint_hash}</code></div>
      </div>
    `;
    provModal.classList.add("active");
  }

  btnCloseModal.addEventListener("click", () => provModal.classList.remove("active"));

  // 8. Unsupervised Discovery & 2D Scatter Engine
  kClustersSlider.addEventListener("input", () => {
    kClustersVal.textContent = kClustersSlider.value;
  });

  btnRunCluster.addEventListener("click", () => loadClusters());

  async function loadClusters() {
    btnRunCluster.textContent = "Clustering Embeddings...";
    btnRunCluster.disabled = true;

    try {
      const resp = await fetch(`/api/v1/discovery/cluster?num_clusters=${kClustersSlider.value}&method=${clusterMethod.value}`);
      const data = await resp.json();
      state.clustersData = data;
      renderClusterSummaries(data.clusters || []);
      renderScatterPlot(data.points_2d || []);
    } catch (err) {
      console.error("Cluster load error:", err);
    } finally {
      btnRunCluster.textContent = "🌌 Compute Embeddings Clusters";
      btnRunCluster.disabled = false;
    }
  }

  function renderClusterSummaries(clusters) {
    if (clusters.length === 0) {
      clusterSummaryList.innerHTML = `<div class="empty-state">No clusters generated. Index more tiles first.</div>`;
      return;
    }

    const clusterColors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];

    clusterSummaryList.innerHTML = clusters.map(c => `
      <div class="cluster-card" style="border-left: 4px solid ${clusterColors[Math.abs(c.cluster_id) % clusterColors.length]}">
        <div style="font-weight:600;font-size:13px;">${c.label}</div>
        <div class="result-meta" style="margin-top:2px;">
          ${c.tile_count} tiles (${c.percentage}%)
        </div>
      </div>
    `).join("");
  }

  function renderScatterPlot(points) {
    const ctx = scatterCanvas.getContext("2d");
    const w = scatterCanvas.width;
    const h = scatterCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Coordinate axis
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

    const clusterColors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];

    points.forEach(pt => {
      // Map [-100, 100] to canvas coords
      const px = (pt.x + 100) / 200 * (w - 40) + 20;
      const py = (pt.y + 100) / 200 * (h - 40) + 20;

      ctx.fillStyle = clusterColors[Math.abs(pt.cluster_id) % clusterColors.length];
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });
  }

  // Initial load
  loadReviewQueue();
});
