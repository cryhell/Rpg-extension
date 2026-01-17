import { extension_settings, getContext, saveSettingsDebounced } from "../../../extensions.js";
import { eventSource, event_types } from "../../../script.js";
import { addExtensionControls } from "../../..//extensions.js";

// --- State Management ---
const defaultSettings = {
    inventory: [],
    journal: {}, 
    location: "Starting Village",
    day: 1,
    hour: 8
};

// Initialize settings
if (!extension_settings.rpg_engine) {
    extension_settings.rpg_engine = Object.assign({}, defaultSettings);
}

// --- Logic: Data Parsing & Hiding Tags ---
function processMessage(mesId) {
    const context = getContext();
    const msg = context.chat[mesId];
    if (msg.role !== 'assistant') return;

    let text = msg.mes;
    const dataRegex = /\[DATA: (.*?)\]/g;
    let match;
    let foundUpdate = false;

    // 1. Parse Data
    while ((match = dataRegex.exec(text)) !== null) {
        try {
            const data = JSON.parse(match[1]);
            if (data.item) extension_settings.rpg_engine.inventory.push(data.item);
            if (data.location) extension_settings.rpg_engine.location = data.location;
            if (data.npc) {
                extension_settings.rpg_engine.journal[data.npc.name] = {
                    relation: data.npc.relation || "Met",
                    notes: data.npc.notes || ""
                };
            }
            foundUpdate = true;
        } catch (e) { console.error("RPG Engine Parse Error", e); }
    }

    // 2. Hide the [DATA] tags and [Choice] lines from the actual chat bubble
    const cleanText = text.replace(/\[DATA:.*?\]/g, '').trim();
    
    // 3. Update UI if needed
    if (foundUpdate) {
        saveSettingsDebounced();
        updateHUD();
    }

    // 4. Inject Choice Buttons
    renderChoices(text, mesId);
}

// --- UI: Creation ---
function updateHUD() {
    const s = extension_settings.rpg_engine;
    const journalHtml = Object.entries(s.journal).map(([name, data]) => `
        <div class="rpg-journal-item">
            <b>${name}</b> (${data.relation})<br><small>${data.notes}</small>
        </div>
    `).join('');

    const html = `
        <div id="rpg-master-panel">
            <h3>🌍 ${s.location}</h3>
            <p>📅 Day ${s.day} | 🕒 ${s.hour}:00</p>
            <hr>
            <h4>🎒 Inventory</h4>
            <p>${s.inventory.join(', ') || 'Empty'}</p>
            <hr>
            <h4>📖 Journal</h4>
            <div style="max-height:150px; overflow-y:auto;">${journalHtml || 'No one met yet.'}</div>
        </div>
    `;

    if ($('#rpg-master-panel').length) {
        $('#rpg-master-panel').replaceWith(html);
    } else {
        $('#extensions_settings').prepend(html);
    }
}

function renderChoices(text, mesId) {
    const choiceRegex = /\[Choice (\d)\]: (.*)/g;
    let match;
    const buttons = [];
    
    while ((match = choiceRegex.exec(text)) !== null) {
        const choiceText = match[2];
        const btn = $(`<button class="rpg-choice-btn">${choiceText}</button>`);
        btn.on('click', () => {
            $('#send_textarea').val(choiceText).trigger('input');
            $('#send_but').click();
        });
        buttons.push(btn);
    }

    if (buttons.length > 0) {
        const container = $('<div class="rpg-choice-container"></div>');
        buttons.forEach(b => container.append(b));
        $(`[data-id="${mesId}"] .mes_text`).append(container);
    }
}

// --- Integration ---
function initExtension() {
    // Add a button to the Extensions list (Puzzle icon)
    const settingsHtml = `
        <div class="rpg-settings">
            <h4>RPG Master Engine</h4>
            <p>Settings and state are handled automatically.</p>
            <button id="reset-rpg" class="menu_button">Reset Game State</button>
        </div>
    `;
    
    addExtensionControls(settingsHtml, "RPG Master", () => {
        updateHUD();
    }, "ra-scroll-unfurled");

    // Listen for messages
    eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, (mesId) => processMessage(mesId));
    
    // Update UI on load
    updateHUD();
    console.log("RPG Master Engine Loaded");
}

$(document).ready(() => {
    initExtension();
});dItem,
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
