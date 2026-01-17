import { extension_settings, getContext, saveSettingsDebounced } from "../../../extensions.js";
import { registerSlashCommand } from "../../../slash-commands.js";

// Initialize Data Structure
const defaultRPGState = {
    inventory: [],
    journal: {}, // { "Name": { status: "Met", notes: "...", relation: "Neutral" } }
    world: {
        time: { day: 1, hour: 8, month: "Spring" },
        location: "Unknown Land",
        reputation: 0,
        map_coord: [0, 0]
    }
};

function getRPG() {
    if (!extension_settings.rpg_engine) {
        extension_settings.rpg_engine = defaultRPGState;
    }
    return extension_settings.rpg_engine;
}

// --- Data Parsing (The Magic) ---
// This looks for [DATA: {...}] in the AI response to update the UI automatically
function scanAIResponseForUpdates(text) {
    const dataRegex = /\[DATA: (.*?)\]/g;
    let match;
    const rpg = getRPG();

    while ((match = dataRegex.exec(text)) !== null) {
        try {
            const update = JSON.parse(match[1]);
            
            if (update.item) rpg.inventory.push(update.item);
            if (update.location) rpg.world.location = update.location;
            if (update.npc) {
                const npcName = update.npc.name;
                rpg.journal[npcName] = {
                    status: update.npc.status || "Known",
                    notes: update.npc.notes || rpg.journal[npcName]?.notes || "",
                    relation: update.npc.relation || "Acquaintance"
                };
            }
        } catch (e) { console.error("RPG Engine failed to parse update:", e); }
    }
    saveSettingsDebounced();
    renderHUD();
}

// --- UI Components ---
function renderHUD() {
    const rpg = getRPG();
    const hud = $(`
        <div id="rpg-hud-sidebar">
            <div class="rpg-stat-card">
                <div class="rpg-title">📍 ${rpg.world.location}</div>
                <div>📅 Day ${rpg.world.time.day} | ${rpg.world.time.hour}:00</div>
            </div>

            <div class="rpg-stat-card">
                <div class="rpg-title">🎒 Inventory</div>
                <div id="inv-list">${rpg.inventory.length ? rpg.inventory.join(', ') : 'Empty'}</div>
            </div>

            <div class="rpg-stat-card">
                <div class="rpg-title">📖 Character Journal</div>
                <div id="journal-list">
                    ${Object.entries(rpg.journal).map(([name, data]) => `
                        <div style="margin-bottom:5px;">
                            <strong>${name}</strong> 
                            <span class="relationship-tag rel-${data.relation.toLowerCase()}">${data.relation}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `);

    // Add to SillyTavern Sidebar
    const container = $('#extensions_settings');
    $('#rpg-hud-sidebar').remove();
    container.append(hud);
}

// --- Choice UI Logic ---
function injectChoices(messageText, messageId) {
    const choices = [];
    const choiceRegex = /\[Choice (\d)\]: (.*)/g;
    let m;
    while ((m = choiceRegex.exec(messageText)) !== null) {
        choices.push(m[2]);
    }

    if (choices.length === 0) return;

    const choiceContainer = $('<div class="rpg-choice-group"></div>');
    choices.forEach(text => {
        const btn = $(`<button class="rpg-choice-btn">${text}</button>`);
        btn.on('click', () => {
            $('#send_textarea').val(text);
            $('#send_but').click();
        });
        choiceContainer.append(btn);
    });

    $(`[data-id="${messageId}"] .mes_text`).append(choiceContainer);
}

// --- Init & Hooks ---
$(document).ready(() => {
    // Watch for new messages
    SillyTavern.on('message_rendered', (messageId) => {
        const context = getContext();
        const msg = context.chat[messageId];
        if (msg.role === 'assistant') {
            scanAIResponseForUpdates(msg.mes);
            injectChoices(msg.mes, messageId);
        }
    });

    renderHUD();
});  
  // Load saved game state
  const savedState = localStorage.getItem(`${extensionName}_gameState`);
  if (savedState) {
    try {
      gameState = JSON.parse(savedState);
    } catch (e) {
      console.error('Failed to load game state:', e);
    }
  }
}

// Save settings
function saveSettings() {
  if (window.SillyTavern?.getContext?.()) {
    const context = window.SillyTavern.getContext();
    if (!context.extensionSettings) {
      context.extensionSettings = {};
    }
    context.extensionSettings[extensionName] = settings;
    window.SillyTavern.saveSettingsDebounced?.();
  }
}

// Save game state
function saveGameState() {
  localStorage.setItem(`${extensionName}_gameState`, JSON.stringify(gameState));
}

// Update world time
function advanceTime(minutes = 30) {
  if (!settings.enable_time_tracking) return;
  
  gameState.worldTime.totalMinutes += minutes;
  
  const hours = Math.floor(gameState.worldTime.totalMinutes / 60) % 24;
  const mins = gameState.worldTime.totalMinutes % 60;
  const days = Math.floor(gameState.worldTime.totalMinutes / (24 * 60));
  
  // Update time of day
  if (hours < 6) gameState.worldTime.timeOfDay = 'Night';
  else if (hours < 12) gameState.worldTime.timeOfDay = 'Morning';
  else if (hours < 18) gameState.worldTime.timeOfDay = 'Afternoon';
  else gameState.worldTime.timeOfDay = 'Evening';
  
  // Simple date system
  const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
  const daysPerSeason = 30;
  const currentDay = (days % daysPerSeason) + 1;
  const currentSeason = seasons[Math.floor((days / daysPerSeason) % 4)];
  const currentYear = Math.floor(days / (daysPerSeason * 4)) + 1;
  
  gameState.worldTime.date = `${currentDay}${getDaySuffix(currentDay)} of ${currentSeason}, Year ${currentYear}`;
  
  updateUI();
  saveGameState();
}

function getDaySuffix(day) {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// Relationship management
function updateRelationship(characterName, category, affection = 0) {
  if (!gameState.relationships[characterName]) {
    gameState.relationships[characterName] = {
      category: 'Stranger',
      affection: 0,
      metAt: gameState.worldTime.date,
      interactions: 0
    };
  }
  
  const rel = gameState.relationships[characterName];
  if (category) rel.category = category;
  if (affection !== 0) {
    rel.affection = Math.max(-100, Math.min(100, rel.affection + affection));
    
    // Auto-update category based on affection
    if (rel.affection > 70) rel.category = 'Close Friend';
    else if (rel.affection > 40) rel.category = 'Friend';
    else if (rel.affection > 10) rel.category = 'Acquaintance';
    else if (rel.affection > -10) rel.category = 'Neutral';
    else if (rel.affection > -40) rel.category = 'Dislike';
    else if (rel.affection > -70) rel.category = 'Rival';
    else rel.category = 'Enemy';
  }
  rel.interactions++;
  
  updateUI();
  saveGameState();
}

// Inventory management
function addItem(itemName, quantity = 1, description = '') {
  const existing = gameState.inventory.find(i => i.name === itemName);
  if (existing) {
    existing.quantity += quantity;
  } else {
    gameState.inventory.push({
      name: itemName,
      quantity: quantity,
      description: description,
      acquiredAt: gameState.worldTime.date
    });
  }
  
  updateUI();
  saveGameState();
}

function removeItem(itemName, quantity = 1) {
  const item = gameState.inventory.find(i => i.name === itemName);
  if (item) {
    item.quantity -= quantity;
    if (item.quantity <= 0) {
      gameState.inventory = gameState.inventory.filter(i => i.name !== itemName);
    }
  }
  
  updateUI();
  saveGameState();
}

// Location management
function setLocation(locationName, region = null) {
  gameState.location = locationName;
  
  if (region) {
    gameState.map.currentRegion = region;
  }
  
  if (!gameState.map.visitedLocations.includes(locationName)) {
    gameState.map.visitedLocations.push(locationName);
  }
  
  updateUI();
  saveGameState();
}

// Generate action choices
async function generateChoices() {
  const numChoices = settings.num_choices;
  
  // Basic placeholder choices - in a full implementation, this would call the AI
  return [
    { action: 'Continue forward', description: 'Press onward with your journey' },
    { action: 'Examine surroundings', description: 'Take a closer look at your environment' },
    { action: 'Talk to someone nearby', description: 'Engage in conversation' },
    { action: 'Check inventory', description: 'Review your belongings' }
  ].slice(0, numChoices);
}

// Create UI panel
function createUIPanel() {
  // Remove existing panel if it exists
  $('#rpg-extension-panel').remove();
  
  const panel = $(`
    <div id="rpg-extension-panel" class="rpg-panel">
      <div class="rpg-panel-header">
        <h3>RPG Status</h3>
        <button id="rpg-toggle" class="menu_button">▼</button>
      </div>
      <div id="rpg-panel-content" class="rpg-panel-content">
        <div class="rpg-section">
          <h4>World Info</h4>
          <div id="rpg-time-display"></div>
          <div id="rpg-location-display"></div>
        </div>
        
        <div class="rpg-section">
          <h4>Inventory (<span id="rpg-inventory-count">0</span>)</h4>
          <div id="rpg-inventory-list"></div>
        </div>
        
        <div class="rpg-section">
          <h4>Relationships (<span id="rpg-relationships-count">0</span>)</h4>
          <div id="rpg-relationships-list"></div>
        </div>
        
        <div class="rpg-section">
          <h4>Map</h4>
          <div id="rpg-map-display"></div>
        </div>
      </div>
      
      <div class="rpg-actions">
        <button id="rpg-reset" class="menu_button">Reset Game</button>
        <button id="rpg-export" class="menu_button">Export Save</button>
        <button id="rpg-import" class="menu_button">Import Save</button>
      </div>
    </div>
  `);
  
  $('#extensions_settings').append(panel);
  
  // Toggle panel
  $('#rpg-toggle').on('click', function() {
    $('#rpg-panel-content').toggle();
    $(this).text($('#rpg-panel-content').is(':visible') ? '▼' : '▶');
  });
  
  // Reset game
  $('#rpg-reset').on('click', function() {
    if (confirm('Are you sure you want to reset all game progress?')) {
      gameState = {
        relationships: {},
        inventory: [],
        location: 'Unknown',
        worldTime: { date: '1st of Spring, Year 1', timeOfDay: 'Morning', totalMinutes: 480 },
        map: { currentRegion: 'Starting Area', visitedLocations: [] }
      };
      saveGameState();
      updateUI();
      window.toastr?.success('Game reset successfully!', 'RPG Extension');
    }
  });
  
  // Export save
  $('#rpg-export').on('click', function() {
    const dataStr = JSON.stringify(gameState, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rpg-save.json';
    link.click();
    window.toastr?.success('Save exported!', 'RPG Extension');
  });
  
  // Import save
  $('#rpg-import').on('click', function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          gameState = JSON.parse(event.target.result);
          saveGameState();
          updateUI();
          window.toastr?.success('Save imported successfully!', 'RPG Extension');
        } catch (err) {
          window.toastr?.error('Failed to import save file.', 'RPG Extension');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
  
  updateUI();
}

// Update UI displays
function updateUI() {
  // Time and location
  $('#rpg-time-display').html(`
    <div><strong>Date:</strong> ${gameState.worldTime.date}</div>
    <div><strong>Time:</strong> ${gameState.worldTime.timeOfDay}</div>
  `);
  
  $('#rpg-location-display').html(`
    <div><strong>Location:</strong> ${gameState.location}</div>
    <div><strong>Region:</strong> ${gameState.map.currentRegion}</div>
  `);
  
  // Inventory
  $('#rpg-inventory-count').text(gameState.inventory.length);
  const inventoryHTML = gameState.inventory.map(item => `
    <div class="rpg-item">
      <strong>${item.name}</strong> x${item.quantity}
      ${item.description ? `<br><small>${item.description}</small>` : ''}
    </div>
  `).join('');
  $('#rpg-inventory-list').html(inventoryHTML || '<em>Empty</em>');
  
  // Relationships
  const relCount = Object.keys(gameState.relationships).length;
  $('#rpg-relationships-count').text(relCount);
  const relHTML = Object.entries(gameState.relationships).map(([name, rel]) => `
    <div class="rpg-relationship">
      <strong>${name}</strong> - ${rel.category}
      <br><small>Affection: ${rel.affection} | Met: ${rel.metAt}</small>
    </div>
  `).join('');
  $('#rpg-relationships-list').html(relHTML || '<em>No relationships yet</em>');
  
  // Map
  const mapHTML = `
    <div><strong>Visited:</strong> ${gameState.map.visitedLocations.length} locations</div>
    <div class="rpg-visited-list">${gameState.map.visitedLocations.join(', ') || 'None'}</div>
  `;
  $('#rpg-map-display').html(mapHTML);
}

// Create choice buttons after each message
function createChoiceButtons() {
  // Remove existing choices
  $('#rpg-choices').remove();
  
  const choicesHTML = `
    <div id="rpg-choices" class="rpg-choices">
      <h4>What would you like to do?</h4>
      <div id="rpg-choice-buttons"></div>
      <div class="rpg-custom-action">
        <input type="text" id="rpg-custom-input" placeholder="Type your own action...">
        <button id="rpg-custom-submit" class="menu_button">Submit</button>
      </div>
    </div>
  `;
  
  // Append to chat
  $('#chat').append(choicesHTML);
  
  // Generate and display choices
  generateChoices().then(choices => {
    const buttonsHTML = choices.map((choice, i) => `
      <button class="rpg-choice-button menu_button" data-action="${choice.action}">
        ${i + 1}. ${choice.action}
        ${choice.description ? `<br><small>${choice.description}</small>` : ''}
      </button>
    `).join('');
    
    $('#rpg-choice-buttons').html(buttonsHTML);
    
    $('.rpg-choice-button').on('click', function() {
      const action = $(this).data('action');
      executeAction(action);
    });
  });
  
  // Custom action submit
  $('#rpg-custom-submit').on('click', function() {
    const customAction = $('#rpg-custom-input').val().trim();
    if (customAction) {
      executeAction(customAction);
    }
  });
  
  $('#rpg-custom-input').on('keypress', function(e) {
    if (e.which === 13) {
      $('#rpg-custom-submit').click();
    }
  });
  
  // Scroll to choices
  setTimeout(() => {
    $('#rpg-choices')[0]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 100);
}

// Execute chosen action
function executeAction(action) {
  // Remove choice buttons
  $('#rpg-choices').remove();
  
  // Advance time
  advanceTime(settings.time_progression_rate);
  
  // Send action as message
  $('#send_textarea').val(action);
  $('#send_but').trigger('click');
}

// Message received event handler
function onMessageReceived() {
  if (settings.auto_generate_choices) {
    setTimeout(createChoiceButtons, 1000);
  }
}

// Initialize extension
jQuery(async () => {
  try {
    console.log('RPG Extension: Initializing...');
    
    loadSettings();
    createUIPanel();
    
    // Listen for message events
    $(document).on('message_received', onMessageReceived);
    
    console.log('RPG Extension: Loaded successfully');
    window.toastr?.success('Interactive Story RPG extension loaded!', 'RPG Extension');
  } catch (error) {
    console.error('RPG Extension: Failed to initialize', error);
    window.toastr?.error('Failed to load RPG extension: ' + error.message, 'RPG Extension');
  }
});

// Export functions for external use
window.rpgExtension = {
  addItem,
  removeItem,
  updateRelationship,
  setLocation,
  advanceTime,
  gameState,
  settings,
  updateUI
};  }
  
  // Load saved game state
  const savedState = localStorage.getItem(`${extensionName}_gameState`);
  if (savedState) {
    try {
      gameState = JSON.parse(savedState);
    } catch (e) {
      console.error('Failed to load game state:', e);
    }
  }
}

// Save game state
function saveGameState() {
  localStorage.setItem(`${extensionName}_gameState`, JSON.stringify(gameState));
}

// Update world time
function advanceTime(minutes = 30) {
  if (!extension_settings[extensionName].enable_time_tracking) return;
  
  gameState.worldTime.totalMinutes += minutes;
  
  const hours = Math.floor(gameState.worldTime.totalMinutes / 60) % 24;
  const mins = gameState.worldTime.totalMinutes % 60;
  const days = Math.floor(gameState.worldTime.totalMinutes / (24 * 60));
  
  // Update time of day
  if (hours < 6) gameState.worldTime.timeOfDay = 'Night';
  else if (hours < 12) gameState.worldTime.timeOfDay = 'Morning';
  else if (hours < 18) gameState.worldTime.timeOfDay = 'Afternoon';
  else gameState.worldTime.timeOfDay = 'Evening';
  
  // Simple date system
  const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
  const daysPerSeason = 30;
  const currentDay = (days % daysPerSeason) + 1;
  const currentSeason = seasons[Math.floor((days / daysPerSeason) % 4)];
  const currentYear = Math.floor(days / (daysPerSeason * 4)) + 1;
  
  gameState.worldTime.date = `${currentDay}${getDaySuffix(currentDay)} of ${currentSeason}, Year ${currentYear}`;
  
  updateUI();
  saveGameState();
}

function getDaySuffix(day) {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

// Relationship management
function updateRelationship(characterName, category, affection = 0) {
  if (!gameState.relationships[characterName]) {
    gameState.relationships[characterName] = {
      category: 'Stranger',
      affection: 0,
      metAt: gameState.worldTime.date,
      interactions: 0
    };
  }
  
  const rel = gameState.relationships[characterName];
  if (category) rel.category = category;
  if (affection !== 0) {
    rel.affection = Math.max(-100, Math.min(100, rel.affection + affection));
    
    // Auto-update category based on affection
    if (rel.affection > 70) rel.category = 'Close Friend';
    else if (rel.affection > 40) rel.category = 'Friend';
    else if (rel.affection > 10) rel.category = 'Acquaintance';
    else if (rel.affection > -10) rel.category = 'Neutral';
    else if (rel.affection > -40) rel.category = 'Dislike';
    else if (rel.affection > -70) rel.category = 'Rival';
    else rel.category = 'Enemy';
  }
  rel.interactions++;
  
  updateUI();
  saveGameState();
}

// Inventory management
function addItem(itemName, quantity = 1, description = '') {
  const existing = gameState.inventory.find(i => i.name === itemName);
  if (existing) {
    existing.quantity += quantity;
  } else {
    gameState.inventory.push({
      name: itemName,
      quantity: quantity,
      description: description,
      acquiredAt: gameState.worldTime.date
    });
  }
  
  updateUI();
  saveGameState();
}

function removeItem(itemName, quantity = 1) {
  const item = gameState.inventory.find(i => i.name === itemName);
  if (item) {
    item.quantity -= quantity;
    if (item.quantity <= 0) {
      gameState.inventory = gameState.inventory.filter(i => i.name !== itemName);
    }
  }
  
  updateUI();
  saveGameState();
}

// Location management
function setLocation(locationName, region = null) {
  gameState.location = locationName;
  
  if (region) {
    gameState.map.currentRegion = region;
  }
  
  if (!gameState.map.visitedLocations.includes(locationName)) {
    gameState.map.visitedLocations.push(locationName);
  }
  
  updateUI();
  saveGameState();
}

// Generate action choices using AI
async function generateChoices() {
  const context = getContext();
  const numChoices = extension_settings[extensionName].num_choices;
  
  const prompt = `Based on the current story context, generate ${numChoices} possible actions the player could take. Format as JSON array with objects containing "action" and "description" fields. Keep actions concise and relevant to the story.`;
  
  try {
    // This would integrate with SillyTavern's API
    // For now, return placeholder choices
    return [
      { action: 'Continue forward', description: 'Press onward with your journey' },
      { action: 'Examine surroundings', description: 'Take a closer look at your environment' },
      { action: 'Talk to someone nearby', description: 'Engage in conversation' },
      { action: 'Check inventory', description: 'Review your belongings' }
    ];
  } catch (e) {
    console.error('Failed to generate choices:', e);
    return [];
  }
}

// Create UI panel
function createUIPanel() {
  const panel = $(`
    <div id="rpg-extension-panel" class="rpg-panel">
      <div class="rpg-panel-header">
        <h3>RPG Status</h3>
        <button id="rpg-toggle" class="menu_button">▼</button>
      </div>
      <div id="rpg-panel-content" class="rpg-panel-content">
        <div class="rpg-section">
          <h4>World Info</h4>
          <div id="rpg-time-display"></div>
          <div id="rpg-location-display"></div>
        </div>
        
        <div class="rpg-section">
          <h4>Inventory (<span id="rpg-inventory-count">0</span>)</h4>
          <div id="rpg-inventory-list"></div>
        </div>
        
        <div class="rpg-section">
          <h4>Relationships (<span id="rpg-relationships-count">0</span>)</h4>
          <div id="rpg-relationships-list"></div>
        </div>
        
        <div class="rpg-section">
          <h4>Map</h4>
          <div id="rpg-map-display"></div>
        </div>
      </div>
      
      <div class="rpg-actions">
        <button id="rpg-reset" class="menu_button">Reset Game</button>
        <button id="rpg-export" class="menu_button">Export Save</button>
        <button id="rpg-import" class="menu_button">Import Save</button>
      </div>
    </div>
  `);
  
  $('#extensions_settings').append(panel);
  
  // Toggle panel
  $('#rpg-toggle').on('click', function() {
    $('#rpg-panel-content').toggle();
    $(this).text($('#rpg-panel-content').is(':visible') ? '▼' : '▶');
  });
  
  // Reset game
  $('#rpg-reset').on('click', function() {
    if (confirm('Are you sure you want to reset all game progress?')) {
      gameState = {
        relationships: {},
        inventory: [],
        location: 'Unknown',
        worldTime: { date: '1st of Spring, Year 1', timeOfDay: 'Morning', totalMinutes: 480 },
        map: { currentRegion: 'Starting Area', visitedLocations: [] }
      };
      saveGameState();
      updateUI();
    }
  });
  
  // Export save
  $('#rpg-export').on('click', function() {
    const dataStr = JSON.stringify(gameState, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rpg-save.json';
    link.click();
  });
  
  // Import save
  $('#rpg-import').on('click', function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          gameState = JSON.parse(event.target.result);
          saveGameState();
          updateUI();
          alert('Save imported successfully!');
        } catch (err) {
          alert('Failed to import save file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

// Update UI displays
function updateUI() {
  // Time and location
  $('#rpg-time-display').html(`
    <div><strong>Date:</strong> ${gameState.worldTime.date}</div>
    <div><strong>Time:</strong> ${gameState.worldTime.timeOfDay}</div>
  `);
  
  $('#rpg-location-display').html(`
    <div><strong>Location:</strong> ${gameState.location}</div>
    <div><strong>Region:</strong> ${gameState.map.currentRegion}</div>
  `);
  
  // Inventory
  $('#rpg-inventory-count').text(gameState.inventory.length);
  const inventoryHTML = gameState.inventory.map(item => `
    <div class="rpg-item">
      <strong>${item.name}</strong> x${item.quantity}
      ${item.description ? `<br><small>${item.description}</small>` : ''}
    </div>
  `).join('');
  $('#rpg-inventory-list').html(inventoryHTML || '<em>Empty</em>');
  
  // Relationships
  const relCount = Object.keys(gameState.relationships).length;
  $('#rpg-relationships-count').text(relCount);
  const relHTML = Object.entries(gameState.relationships).map(([name, rel]) => `
    <div class="rpg-relationship">
      <strong>${name}</strong> - ${rel.category}
      <br><small>Affection: ${rel.affection} | Met: ${rel.metAt}</small>
    </div>
  `).join('');
  $('#rpg-relationships-list').html(relHTML || '<em>No relationships yet</em>');
  
  // Map
  const mapHTML = `
    <div><strong>Visited:</strong> ${gameState.map.visitedLocations.length} locations</div>
    <div class="rpg-visited-list">${gameState.map.visitedLocations.join(', ') || 'None'}</div>
  `;
  $('#rpg-map-display').html(mapHTML);
}

// Create choice buttons after each message
function createChoiceButtons() {
  const choicesHTML = `
    <div id="rpg-choices" class="rpg-choices">
      <h4>What would you like to do?</h4>
      <div id="rpg-choice-buttons"></div>
      <div class="rpg-custom-action">
        <input type="text" id="rpg-custom-input" placeholder="Type your own action...">
        <button id="rpg-custom-submit" class="menu_button">Submit</button>
      </div>
    </div>
  `;
  
  // Append to chat
  $('#chat').append(choicesHTML);
  
  // Generate and display choices
  generateChoices().then(choices => {
    const buttonsHTML = choices.map((choice, i) => `
      <button class="rpg-choice-button menu_button" data-action="${choice.action}">
        ${i + 1}. ${choice.action}
        ${choice.description ? `<br><small>${choice.description}</small>` : ''}
      </button>
    `).join('');
    
    $('#rpg-choice-buttons').html(buttonsHTML);
    
    $('.rpg-choice-button').on('click', function() {
      const action = $(this).data('action');
      executeAction(action);
    });
  });
  
  // Custom action submit
  $('#rpg-custom-submit').on('click', function() {
    const customAction = $('#rpg-custom-input').val().trim();
    if (customAction) {
      executeAction(customAction);
    }
  });
  
  $('#rpg-custom-input').on('keypress', function(e) {
    if (e.which === 13) {
      $('#rpg-custom-submit').click();
    }
  });
}

// Execute chosen action
function executeAction(action) {
  // Remove choice buttons
  $('#rpg-choices').remove();
  
  // Advance time
  advanceTime(extension_settings[extensionName].time_progression_rate);
  
  // Send action as message
  const context = getContext();
  $('#send_textarea').val(action);
  $('#send_but').click();
}

// Event listeners
eventSource.on(event_types.MESSAGE_RECEIVED, () => {
  if (extension_settings[extensionName].auto_generate_choices) {
    setTimeout(createChoiceButtons, 500);
  }
});

// Initialize extension
jQuery(async () => {
  loadSettings();
  createUIPanel();
  updateUI();
  
  console.log('RPG Extension loaded');
});

// Export functions for external use
window.rpgExtension = {
  addItem,
  removeItem,
  updateRelationship,
  setLocation,
  advanceTime,
  gameState
};
