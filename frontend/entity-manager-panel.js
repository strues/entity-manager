class EntityManagerPanel extends HTMLElement {
  constructor() {
    super();
    this.hass = null;
    this.data = [];
    this.deviceInfo = {};
    this.expandedIntegrations = new Set();
    this.expandedDevices = new Set();
    this.selectedEntities = new Set();
    this.searchTerm = '';
    this.viewState = 'disabled';
  }

  set panel(info) {
    this.hass = info.hass;
    if (!this.content) {
      this.render();
      this.loadData();
    }
  }

  async loadData() {
    try {
      const result = await this.hass.callWS({
        type: 'entity_manager/get_disabled_entities',
        state: this.viewState,
      });
      
      this.data = result;
      
      // Load device information
      await this.loadDeviceInfo();
      
      this.updateView();
    } catch (err) {
      console.error('Error loading disabled entities:', err);
      this.showError('Failed to load disabled entities');
    }
  }

  async loadDeviceInfo() {
    try {
      const deviceRegistry = await this.hass.callWS({
        type: 'config/device_registry/list',
      });
      
      this.deviceInfo = {};
      deviceRegistry.forEach(device => {
        this.deviceInfo[device.id] = device;
      });
    } catch (err) {
      console.error('Error loading device info:', err);
    }
  }

  render() {
    this.content = document.createElement('div');
    this.content.style.cssText = `
      padding: 16px;
      max-width: 1400px;
      margin: 0 auto;
      font-family: var(--paper-font-body1_-_font-family);
    `;
    
    this.content.innerHTML = `
      <style>
        .header {
          margin-bottom: 24px;
        }
        .header h1 {
          margin: 0 0 8px 0;
          font-size: 2em;
          font-weight: 400;
        }
        .header p {
          margin: 0;
          color: var(--secondary-text-color);
        }
        .toolbar {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .filter-group {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .filter-toggle {
          padding: 8px 12px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          color: var(--primary-text-color);
        }
        .filter-toggle.active {
          border-color: var(--primary-color);
          color: var(--primary-color);
        }
        .search-box {
          flex: 1;
          min-width: 300px;
          padding: 8px 12px;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          font-size: 14px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
        }
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background 0.2s;
        }
        .btn-primary {
          background: var(--primary-color);
          color: white;
        }
        .btn-primary:hover {
          background: var(--dark-primary-color);
        }
        .btn-secondary {
          background: var(--divider-color);
          color: var(--primary-text-color);
        }
        .btn-secondary:hover {
          background: var(--secondary-background-color);
        }
        .stats {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .stat-card {
          background: var(--card-background-color);
          padding: 16px;
          border-radius: 8px;
          flex: 1;
          min-width: 150px;
        }
        .stat-label {
          color: var(--secondary-text-color);
          font-size: 12px;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        .stat-value {
          font-size: 24px;
          font-weight: 500;
        }
        .integration-group {
          background: var(--card-background-color);
          border-radius: 8px;
          margin-bottom: 12px;
          overflow: hidden;
        }
        .integration-header {
          display: flex;
          align-items: center;
          padding: 16px;
          cursor: pointer;
          user-select: none;
          border-bottom: 1px solid var(--divider-color);
        }
        .integration-header:hover {
          background: var(--secondary-background-color);
        }
        .integration-icon {
          margin-right: 12px;
          transition: transform 0.2s;
        }
        .integration-icon.expanded {
          transform: rotate(90deg);
        }
        .integration-info {
          flex: 1;
        }
        .integration-name {
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 4px;
        }
        .integration-stats {
          font-size: 12px;
          color: var(--secondary-text-color);
        }
        .integration-actions {
          display: flex;
          gap: 8px;
        }
        .device-list {
          padding: 0 16px 16px 16px;
        }
        .device-item {
          border-left: 2px solid var(--divider-color);
          margin-left: 24px;
          margin-bottom: 8px;
        }
        .device-header {
          display: flex;
          align-items: center;
          padding: 12px;
          cursor: pointer;
          user-select: none;
        }
        .device-header:hover {
          background: var(--secondary-background-color);
        }
        .device-name {
          flex: 1;
          font-weight: 500;
        }
        .device-count {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-right: 12px;
        }
        .entity-list {
          padding: 0 12px 12px 36px;
        }
        .entity-item {
          display: flex;
          align-items: center;
          padding: 8px;
          margin-bottom: 4px;
          border-radius: 4px;
        }
        .entity-item:hover {
          background: var(--secondary-background-color);
        }
        .entity-checkbox {
          margin-right: 12px;
          cursor: pointer;
        }
        .entity-info {
          flex: 1;
        }
        .entity-id {
          font-size: 13px;
        }
        .entity-name {
          font-size: 11px;
          color: var(--secondary-text-color);
        }
        .entity-badge {
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 3px;
          background: var(--divider-color);
          margin-left: 8px;
        }
        .entity-actions {
          display: flex;
          gap: 4px;
        }
        .icon-btn {
          padding: 4px 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 4px;
          color: var(--primary-text-color);
        }
        .icon-btn:hover {
          background: var(--divider-color);
        }
        .empty-state {
          text-align: center;
          padding: 48px;
          color: var(--secondary-text-color);
        }
        .checkbox-group {
          display: flex;
          align-items: center;
          margin-right: 12px;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
        }
        .modal {
          background: var(--card-background-color, #fff);
          border-radius: 12px;
          padding: 24px;
          min-width: 500px;
          max-width: 700px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 4px 24px rgba(0,0,0,0.3);
        }
        .modal h2 {
          margin: 0 0 16px 0;
          font-weight: 500;
        }
        .modal-field {
          margin-bottom: 12px;
        }
        .modal-field label {
          display: block;
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        .modal-field input, .modal-field select {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          font-size: 14px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
          box-sizing: border-box;
        }
        .modal-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 16px;
        }
        .preview-list {
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          margin-top: 12px;
        }
        .preview-item {
          padding: 8px 12px;
          border-bottom: 1px solid var(--divider-color);
          font-size: 13px;
        }
        .preview-item:last-child {
          border-bottom: none;
        }
        .preview-old {
          color: var(--error-color, #db4437);
          text-decoration: line-through;
        }
        .preview-new {
          color: var(--success-color, #43a047);
        }
        .preview-skip {
          color: var(--secondary-text-color);
          font-style: italic;
        }
        .rename-result {
          margin-top: 12px;
          padding: 12px;
          border-radius: 4px;
          font-size: 13px;
        }
        .rename-result.success {
          background: rgba(67, 160, 71, 0.1);
          color: var(--success-color, #43a047);
        }
        .rename-result.error {
          background: rgba(219, 68, 55, 0.1);
          color: var(--error-color, #db4437);
        }
        .btn-rename {
          background: var(--accent-color, #ff9800);
          color: white;
        }
        .btn-rename:hover {
          filter: brightness(0.9);
        }
      </style>
      
      <div class="header">
        <h1>Entity Manager</h1>
        <p>Manage disabled entities by integration and device</p>
      </div>
      
      <div class="stats" id="stats"></div>
      
      <div class="toolbar">
        <div class="filter-group">
          <button class="filter-toggle" data-filter="disabled">Disabled</button>
          <button class="filter-toggle" data-filter="enabled">Enabled</button>
          <button class="filter-toggle" data-filter="all">All</button>
        </div>
        <input 
          type="text" 
          class="search-box" 
          placeholder="Search entities, devices, or integrations..."
          id="search-input"
        />
        <button class="btn btn-primary" id="enable-selected">
          Enable Selected (<span id="selected-count">0</span>)
        </button>
        <button class="btn btn-secondary" id="disable-selected">
          Disable Selected (<span id="selected-count-2">0</span>)
        </button>
        <button class="btn btn-rename" id="rename-selected">
          Rename Selected (<span id="selected-count-3">0</span>)
        </button>
        <button class="btn btn-secondary" id="refresh">Refresh</button>
      </div>
      
      <div id="content"></div>
    `;
    
    this.appendChild(this.content);
    
    // Event listeners
    this.content.querySelector('#search-input').addEventListener('input', (e) => {
      this.searchTerm = e.target.value.toLowerCase();
      this.updateView();
    });
    
    this.content.querySelector('#enable-selected').addEventListener('click', () => {
      this.bulkEnable();
    });
    
    this.content.querySelector('#disable-selected').addEventListener('click', () => {
      this.bulkDisable();
    });

    this.content.querySelector('#rename-selected').addEventListener('click', () => {
      this.openBulkRenameModal();
    });

    this.content.querySelector('#refresh').addEventListener('click', () => {
      this.loadData();
    });

    this.content.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.viewState = btn.dataset.filter;
        this.setActiveFilter();
        this.loadData();
      });
    });

    this.setActiveFilter();
  }

  updateView() {
    const statsEl = this.content.querySelector('#stats');
    const contentEl = this.content.querySelector('#content');
    
    // Filter data based on search
    let filteredData = this.data;
    if (this.searchTerm) {
      filteredData = this.data.map(integration => {
        const filteredDevices = {};
        Object.entries(integration.devices).forEach(([deviceId, device]) => {
          const filteredEntities = device.entities.filter(entity => 
            entity.entity_id.toLowerCase().includes(this.searchTerm) ||
            (entity.original_name && entity.original_name.toLowerCase().includes(this.searchTerm)) ||
            integration.integration.toLowerCase().includes(this.searchTerm) ||
            (this.getDeviceName(deviceId).toLowerCase().includes(this.searchTerm))
          );
          
          if (filteredEntities.length > 0) {
            filteredDevices[deviceId] = {
              ...device,
              entities: filteredEntities
            };
          }
        });
        
        return {
          ...integration,
          devices: filteredDevices
        };
      }).filter(integration => Object.keys(integration.devices).length > 0);
    }
    
    // Update stats
    const totalIntegrations = filteredData.length;
    const totalDevices = filteredData.reduce((sum, int) => sum + Object.keys(int.devices).length, 0);
    const totalEntities = filteredData.reduce(
      (sum, integration) =>
        sum + Object.values(integration.devices).reduce(
          (deviceSum, device) => deviceSum + device.entities.length,
          0,
        ),
      0,
    );
    
    statsEl.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Integrations</div>
        <div class="stat-value">${totalIntegrations}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Devices</div>
        <div class="stat-value">${totalDevices}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Disabled Entities</div>
        <div class="stat-value">${totalEntities}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Selected</div>
        <div class="stat-value">${this.selectedEntities.size}</div>
      </div>
    `;
    
    // Update selected count in buttons
    this.content.querySelector('#selected-count').textContent = this.selectedEntities.size;
    this.content.querySelector('#selected-count-2').textContent = this.selectedEntities.size;
    this.content.querySelector('#selected-count-3').textContent = this.selectedEntities.size;
    
    // Render integrations
    if (filteredData.length === 0) {
      contentEl.innerHTML = `
        <div class="empty-state">
          <h2>🎉 No disabled entities found</h2>
          <p>All your entities are enabled, or they match your search criteria.</p>
        </div>
      `;
      return;
    }
    
    contentEl.innerHTML = filteredData.map(integration => this.renderIntegration(integration)).join('');
    
    // Attach event listeners
    this.attachEventListeners();
  }

  renderIntegration(integration) {
    const isExpanded = this.expandedIntegrations.has(integration.integration);
    const deviceCount = Object.keys(integration.devices).length;
    const shownEntities = Object.values(integration.devices).reduce(
      (sum, device) => sum + device.entities.length,
      0,
    );
    const disabledCount = integration.disabled_entities ?? 0;
    const totalCount = integration.total_entities ?? shownEntities;
    
    return `
      <div class="integration-group">
        <div class="integration-header" data-integration="${integration.integration}">
          <div class="integration-icon ${isExpanded ? 'expanded' : ''}">▶</div>
          <div class="integration-info">
            <div class="integration-name">${integration.integration}</div>
            <div class="integration-stats">
              ${deviceCount} device${deviceCount !== 1 ? 's' : ''} • 
              ${shownEntities} shown • ${disabledCount} disabled • ${totalCount} total
            </div>
          </div>
          <div class="integration-actions">
            <button class="btn btn-primary" data-action="enable-integration" data-integration="${integration.integration}">
              Enable All
            </button>
          </div>
        </div>
        ${isExpanded ? `
          <div class="device-list">
            ${Object.entries(integration.devices).map(([deviceId, device]) => 
              this.renderDevice(deviceId, device, integration.integration)
            ).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  renderDevice(deviceId, device, integrationName) {
    const isExpanded = this.expandedDevices.has(deviceId);
    const deviceName = this.getDeviceName(deviceId);
    const entityCount = device.entities.length;
    const disabledCount = device.disabled_entities ?? 0;
    const totalCount = device.total_entities ?? entityCount;
    
    return `
      <div class="device-item">
        <div class="device-header" data-device="${deviceId}">
          <div class="integration-icon ${isExpanded ? 'expanded' : ''}">▶</div>
          <div class="device-name">${deviceName}</div>
          <div class="device-count">${entityCount} shown • ${disabledCount} disabled • ${totalCount} total</div>
          <button class="btn btn-primary" data-action="enable-device" data-device="${deviceId}">
            Enable All
          </button>
        </div>
        ${isExpanded ? `
          <div class="entity-list">
            ${device.entities.map(entity => this.renderEntity(entity)).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  renderEntity(entity) {
    const isSelected = this.selectedEntities.has(entity.entity_id);
    const displayName = entity.original_name || entity.entity_id.split('.')[1].replace(/_/g, ' ');
    const isDisabled = !!entity.is_disabled;
    const action = isDisabled ? 'enable-entity' : 'disable-entity';
    const actionLabel = isDisabled ? 'Enable' : 'Disable';
    const actionIcon = isDisabled ? '✓' : '✕';
    
    return `
      <div class="entity-item">
        <input 
          type="checkbox" 
          class="entity-checkbox" 
          data-entity="${entity.entity_id}"
          ${isSelected ? 'checked' : ''}
        />
        <div class="entity-info">
          <div class="entity-id">${entity.entity_id}</div>
          ${entity.original_name ? `<div class="entity-name">${entity.original_name}</div>` : ''}
          ${entity.entity_category ? `<span class="entity-badge">${entity.entity_category}</span>` : ''}
          ${isDisabled ? `<span class="entity-badge">disabled${entity.disabled_by ? ` by: ${entity.disabled_by}` : ''}</span>` : '<span class="entity-badge">enabled</span>'}
        </div>
        <div class="entity-actions">
          <button class="icon-btn" data-action="rename-entity" data-entity="${entity.entity_id}" title="Rename">
            ✎
          </button>
          <button class="icon-btn" data-action="${action}" data-entity="${entity.entity_id}" title="${actionLabel}">
            ${actionIcon}
          </button>
        </div>
      </div>
    `;
  }

  getDeviceName(deviceId) {
    if (!deviceId || deviceId === 'no_device') {
      return '(No Device)';
    }
    const device = this.deviceInfo[deviceId];
    return device ? (device.name_by_user || device.name || deviceId) : deviceId;
  }

  attachEventListeners() {
    // Integration toggle
    this.content.querySelectorAll('[data-integration]').forEach(el => {
      if (el.classList.contains('integration-header')) {
        el.addEventListener('click', (e) => {
          if (e.target.closest('button')) return;
          const integration = el.dataset.integration;
          if (this.expandedIntegrations.has(integration)) {
            this.expandedIntegrations.delete(integration);
          } else {
            this.expandedIntegrations.add(integration);
          }
          this.updateView();
        });
      }
    });
    
    // Device toggle
    this.content.querySelectorAll('[data-device]').forEach(el => {
      if (el.classList.contains('device-header')) {
        el.addEventListener('click', (e) => {
          if (e.target.closest('button')) return;
          const deviceId = el.dataset.device;
          if (this.expandedDevices.has(deviceId)) {
            this.expandedDevices.delete(deviceId);
          } else {
            this.expandedDevices.add(deviceId);
          }
          this.updateView();
        });
      }
    });
    
    // Entity checkboxes
    this.content.querySelectorAll('.entity-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const entityId = e.target.dataset.entity;
        if (e.target.checked) {
          this.selectedEntities.add(entityId);
        } else {
          this.selectedEntities.delete(entityId);
        }
        this.updateView();
      });
    });
    
    // Action buttons
    this.content.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        
        if (action === 'enable-entity') {
          await this.enableEntity(btn.dataset.entity);
        } else if (action === 'enable-device') {
          await this.enableDevice(btn.dataset.device);
        } else if (action === 'enable-integration') {
          await this.enableIntegration(btn.dataset.integration);
        } else if (action === 'disable-entity') {
          await this.disableEntity(btn.dataset.entity);
        } else if (action === 'rename-entity') {
          this.openSingleRenameModal(btn.dataset.entity);
        }
      });
    });
  }

  async enableEntity(entityId) {
    try {
      await this.hass.callWS({
        type: 'entity_manager/enable_entity',
        entity_id: entityId,
      });
      this.selectedEntities.delete(entityId);
      await this.loadData();
    } catch (err) {
      console.error('Error enabling entity:', err);
      alert(`Failed to enable ${entityId}: ${err.message}`);
    }
  }

  async enableDevice(deviceId) {
    const integration = this.data.find(int => int.devices[deviceId]);
    if (!integration) return;
    
    const entityIds = integration.devices[deviceId].entities.map(e => e.entity_id);
    await this.bulkEnableEntities(entityIds);
  }

  async enableIntegration(integrationName) {
    const integration = this.data.find(int => int.integration === integrationName);
    if (!integration) return;
    
    const entityIds = [];
    Object.values(integration.devices).forEach(device => {
      device.entities.forEach(entity => {
        entityIds.push(entity.entity_id);
      });
    });
    
    await this.bulkEnableEntities(entityIds);
  }

  async bulkEnable() {
    if (this.selectedEntities.size === 0) {
      alert('No entities selected');
      return;
    }
    
    await this.bulkEnableEntities(Array.from(this.selectedEntities));
  }

  async bulkDisable() {
    if (this.selectedEntities.size === 0) {
      alert('No entities selected');
      return;
    }
    
    try {
      const result = await this.hass.callWS({
        type: 'entity_manager/bulk_disable',
        entity_ids: Array.from(this.selectedEntities),
      });
      
      this.selectedEntities.clear();
      await this.loadData();
      
      if (result.failed.length > 0) {
        alert(`Disabled ${result.success.length} entities. Failed: ${result.failed.length}`);
      }
    } catch (err) {
      console.error('Error bulk disabling:', err);
      alert('Failed to disable entities');
    }
  }

  async bulkEnableEntities(entityIds) {
    try {
      const result = await this.hass.callWS({
        type: 'entity_manager/bulk_enable',
        entity_ids: entityIds,
      });
      
      entityIds.forEach(id => this.selectedEntities.delete(id));
      await this.loadData();
      
      if (result.failed.length > 0) {
        alert(`Enabled ${result.success.length} entities. Failed: ${result.failed.length}`);
      }
    } catch (err) {
      console.error('Error bulk enabling:', err);
      alert('Failed to enable entities');
    }
  }

  async disableEntity(entityId) {
    try {
      await this.hass.callWS({
        type: 'entity_manager/disable_entity',
        entity_id: entityId,
      });
      this.selectedEntities.delete(entityId);
      await this.loadData();
    } catch (err) {
      console.error('Error disabling entity:', err);
      alert(`Failed to disable ${entityId}: ${err.message}`);
    }
  }

  // --- Rename methods ---

  findEntityData(entityId) {
    for (const integration of this.data) {
      for (const device of Object.values(integration.devices)) {
        const entity = device.entities.find(e => e.entity_id === entityId);
        if (entity) return entity;
      }
    }
    return null;
  }

  openSingleRenameModal(entityId) {
    const entity = this.findEntityData(entityId);
    const currentName = entity
      ? (entity.name || entity.original_name || entityId.split('.')[1].replace(/_/g, ' '))
      : entityId.split('.')[1].replace(/_/g, ' ');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h2>Rename Entity</h2>
        <div class="modal-field">
          <label>Entity ID</label>
          <input type="text" id="rename-entity-id" value="${entityId}" />
        </div>
        <div class="modal-field">
          <label>Friendly Name</label>
          <input type="text" id="rename-name" value="${this.escapeHtml(currentName)}" />
        </div>
        <div id="rename-result"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="rename-cancel">Cancel</button>
          <button class="btn btn-primary" id="rename-apply">Rename</button>
        </div>
      </div>
    `;

    this.appendChild(overlay);

    overlay.querySelector('#rename-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#rename-apply').addEventListener('click', async () => {
      const newEntityId = overlay.querySelector('#rename-entity-id').value.trim();
      const newName = overlay.querySelector('#rename-name').value.trim();
      const resultEl = overlay.querySelector('#rename-result');

      try {
        const params = { type: 'entity_manager/rename_entity', entity_id: entityId };
        if (newName && newName !== currentName) params.name = newName;
        if (newEntityId && newEntityId !== entityId) params.new_entity_id = newEntityId;

        if (!params.name && !params.new_entity_id) {
          resultEl.innerHTML = '<div class="rename-result error">No changes detected.</div>';
          return;
        }

        await this.hass.callWS(params);
        resultEl.innerHTML = '<div class="rename-result success">Renamed successfully.</div>';
        setTimeout(() => { overlay.remove(); this.loadData(); }, 800);
      } catch (err) {
        resultEl.innerHTML = `<div class="rename-result error">Error: ${err.message}</div>`;
      }
    });
  }

  openBulkRenameModal() {
    if (this.selectedEntities.size === 0) {
      alert('No entities selected');
      return;
    }

    const selectedIds = Array.from(this.selectedEntities);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h2>Bulk Rename (${selectedIds.length} entities)</h2>
        <div class="modal-field">
          <label>Target</label>
          <select id="bulk-rename-target">
            <option value="name">Friendly Name</option>
            <option value="entity_id">Entity ID</option>
          </select>
        </div>
        <div class="modal-field">
          <label>Find</label>
          <input type="text" id="bulk-rename-find" placeholder="Text to find..." />
        </div>
        <div class="modal-field">
          <label>Replace with</label>
          <input type="text" id="bulk-rename-replace" placeholder="Replacement text..." />
        </div>
        <button class="btn btn-secondary" id="bulk-rename-preview">Preview Changes</button>
        <div id="bulk-rename-preview-list"></div>
        <div id="bulk-rename-result"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="bulk-rename-cancel">Cancel</button>
          <button class="btn btn-rename" id="bulk-rename-apply" disabled>Apply Rename</button>
        </div>
      </div>
    `;

    this.appendChild(overlay);

    overlay.querySelector('#bulk-rename-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#bulk-rename-preview').addEventListener('click', () => {
      this.renderBulkRenamePreview(overlay, selectedIds);
    });

    // Also update preview on input change
    ['#bulk-rename-find', '#bulk-rename-replace', '#bulk-rename-target'].forEach(sel => {
      overlay.querySelector(sel).addEventListener('input', () => {
        this.renderBulkRenamePreview(overlay, selectedIds);
      });
      overlay.querySelector(sel).addEventListener('change', () => {
        this.renderBulkRenamePreview(overlay, selectedIds);
      });
    });

    overlay.querySelector('#bulk-rename-apply').addEventListener('click', async () => {
      await this.executeBulkRename(overlay, selectedIds);
    });
  }

  renderBulkRenamePreview(overlay, selectedIds) {
    const target = overlay.querySelector('#bulk-rename-target').value;
    const findStr = overlay.querySelector('#bulk-rename-find').value;
    const replaceStr = overlay.querySelector('#bulk-rename-replace').value;
    const previewEl = overlay.querySelector('#bulk-rename-preview-list');
    const applyBtn = overlay.querySelector('#bulk-rename-apply');

    if (!findStr) {
      previewEl.innerHTML = '';
      applyBtn.disabled = true;
      return;
    }

    let matchCount = 0;
    const items = selectedIds.map(entityId => {
      const entity = this.findEntityData(entityId);

      if (target === 'name') {
        const currentName = entity
          ? (entity.name || entity.original_name || entityId.split('.')[1].replace(/_/g, ' '))
          : entityId.split('.')[1].replace(/_/g, ' ');
        if (currentName.includes(findStr)) {
          const newName = currentName.replace(findStr, replaceStr);
          matchCount++;
          return `<div class="preview-item">
            <div><strong>${entityId}</strong></div>
            <div><span class="preview-old">${this.escapeHtml(currentName)}</span></div>
            <div><span class="preview-new">${this.escapeHtml(newName)}</span></div>
          </div>`;
        }
        return `<div class="preview-item preview-skip">${entityId} — no match</div>`;
      } else {
        if (entityId.includes(findStr)) {
          const newId = entityId.replace(findStr, replaceStr);
          matchCount++;
          return `<div class="preview-item">
            <div><span class="preview-old">${this.escapeHtml(entityId)}</span></div>
            <div><span class="preview-new">${this.escapeHtml(newId)}</span></div>
          </div>`;
        }
        return `<div class="preview-item preview-skip">${entityId} — no match</div>`;
      }
    });

    previewEl.innerHTML = `
      <div style="margin: 12px 0 4px; font-size: 13px; color: var(--secondary-text-color);">
        ${matchCount} of ${selectedIds.length} entities will be renamed
      </div>
      <div class="preview-list">${items.join('')}</div>
    `;
    applyBtn.disabled = matchCount === 0;
  }

  async executeBulkRename(overlay, selectedIds) {
    const target = overlay.querySelector('#bulk-rename-target').value;
    const findStr = overlay.querySelector('#bulk-rename-find').value;
    const replaceStr = overlay.querySelector('#bulk-rename-replace').value;
    const resultEl = overlay.querySelector('#bulk-rename-result');
    const applyBtn = overlay.querySelector('#bulk-rename-apply');

    applyBtn.disabled = true;
    applyBtn.textContent = 'Renaming...';

    try {
      const result = await this.hass.callWS({
        type: 'entity_manager/bulk_rename',
        entity_ids: selectedIds,
        find: findStr,
        replace: replaceStr,
        target: target,
      });

      const successCount = result.success.length;
      const failedCount = result.failed.length;
      const skippedCount = result.skipped.length;

      let msg = `Renamed ${successCount} entities.`;
      if (skippedCount > 0) msg += ` Skipped ${skippedCount} (no match).`;
      if (failedCount > 0) msg += ` Failed: ${failedCount}.`;

      const isError = failedCount > 0 && successCount === 0;
      resultEl.innerHTML = `<div class="rename-result ${isError ? 'error' : 'success'}">${msg}</div>`;

      if (successCount > 0) {
        this.selectedEntities.clear();
        setTimeout(() => { overlay.remove(); this.loadData(); }, 1200);
      } else {
        applyBtn.disabled = false;
        applyBtn.textContent = 'Apply Rename';
      }
    } catch (err) {
      resultEl.innerHTML = `<div class="rename-result error">Error: ${err.message}</div>`;
      applyBtn.disabled = false;
      applyBtn.textContent = 'Apply Rename';
    }
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  setActiveFilter() {
    this.content.querySelectorAll('[data-filter]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === this.viewState);
    });
  }

  showError(message) {
    const contentEl = this.content.querySelector('#content');
    contentEl.innerHTML = `
      <div class="empty-state">
        <h2>⚠️ Error</h2>
        <p>${message}</p>
      </div>
    `;
  }
}

customElements.define('entity-manager-panel', EntityManagerPanel);
