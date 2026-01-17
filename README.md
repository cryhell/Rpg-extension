# SillyTavern RPG Extension

Transform SillyTavern into a fully-fledged interactive RPG experience with choice-driven gameplay, relationship tracking, inventory management, and world state monitoring.

## Features

### 🎮 Interactive Story Choices
- **Auto-generated choices**: After each AI response, get 4 contextual action choices
- **Custom actions**: Don't like the options? Type your own action
- **Smart suggestions**: Choices adapt to your story context

### 👥 Relationship System
- **Track all NPCs**: Automatically save characters you meet
- **Dynamic categories**: Stranger → Acquaintance → Friend → Close Friend (or Enemy path)
- **Affection scores**: -100 to +100 relationship values
- **History tracking**: See when you met each character and interaction counts

### 🎒 Inventory Management
- **Add/remove items**: Full inventory system with quantities
- **Item descriptions**: Store additional info about each item
- **Acquisition tracking**: Remember when and where you got items
- **Easy access**: View inventory anytime in the status panel

### 🌍 World State Tracking
- **Date system**: Seasons, days, and years automatically tracked
- **Time of day**: Morning, Afternoon, Evening, Night
- **Time progression**: Configurable minutes passed per action
- **Persistent calendar**: Your world evolves over time

### 🗺️ Location & Map System
- **Current location**: Always know where you are
- **Region tracking**: Broader area categorization
- **Visited locations**: Keep a list of everywhere you've been
- **Discovery system**: Build your map as you explore

## Installation

1. **Download the extension files**:
   - `manifest.json`
   - `index.js`
   - `style.css`

2. **Install in SillyTavern**:
   ```
   SillyTavern/
   └── public/
       └── scripts/
           └── extensions/
               └── third-party/
                   └── rpg-extension/
                       ├── manifest.json
                       ├── index.js
                       └── style.css
   ```

3. **Enable the extension**:
   - Go to SillyTavern Extensions menu
   - Find "Interactive Story RPG"
   - Enable the extension

4. **Configure settings**:
   - Auto-generate choices: On/Off
   - Number of choices: 2-6 (default 4)
   - Time tracking: On/Off
   - Time progression rate: Minutes per action

## Usage

### Basic Gameplay

Once enabled, the extension automatically:
1. Shows choice buttons after each AI response
2. Updates world time when you take actions
3. Tracks your inventory and relationships
4. Records your location changes

### Manual Commands

You can also control the RPG systems programmatically using the console or custom scripts:

```javascript
// Add item to inventory
window.rpgExtension.addItem('Health Potion', 3, 'Restores 50 HP');

// Remove item
window.rpgExtension.removeItem('Health Potion', 1);

// Update relationship
window.rpgExtension.updateRelationship('Alice', 'Friend', 15);

// Change location
window.rpgExtension.setLocation('Forest Clearing', 'Whispering Woods');

// Advance time manually
window.rpgExtension.advanceTime(60); // 60 minutes

// Access game state
console.log(window.rpgExtension.gameState);
```

### Character Prompting

For best results, add this to your character card or system prompt:

```
[RPG System Active]
You are narrating an interactive RPG story. After each response:
- Describe the scene and outcomes of the player's action
- Mention any items the player might find or receive
- Note any characters the player meets or interacts with
- Indicate location changes when the player moves
- Suggest time has passed when appropriate

When the player receives items, you can add them using: "You obtained [item name]"
When meeting characters, describe their attitude and relationship status.
When moving locations, clearly state: "You arrive at [location name]"
```

### Integration Tips

**For automatic item tracking**, structure AI responses like:
- "You found a *Rusty Sword* in the chest."
- "The merchant gives you 3 *Health Potions*."

**For relationship updates**, mention characters by name:
- "Alice seems pleased with your help." (triggers positive affection)
- "The guard glares at you suspiciously." (triggers negative affection)

**For location tracking**, clearly state movements:
- "You enter the *Dark Cave*."
- "After hours of travel, you reach *Riverdale Village*."

## Advanced Features

### Save/Load System
- **Export Save**: Download your entire game state as JSON
- **Import Save**: Load a previously saved game
- **Auto-save**: Game state automatically saved to browser localStorage

### Reset Function
- Clear all progress and start fresh
- Confirmation dialog prevents accidents

### Responsive Design
- Works on desktop and mobile
- Collapsible status panel
- Scrollable lists for long inventories

## Customization

### Extending the System

The extension exposes a global `window.rpgExtension` object with methods you can use in your own scripts or character cards:

```javascript
// Custom inventory categories
window.rpgExtension.addItem('Dragon Scale', 1, 'Crafting Material');

// Complex relationship systems
window.rpgExtension.updateRelationship('Dragon', 'Ally', 50);

// World building
window.rpgExtension.setLocation('Dragon\'s Lair', 'Northern Mountains');

// Custom time events
if (window.rpgExtension.gameState.worldTime.timeOfDay === 'Night') {
  // Trigger night events
}
```

### Styling

Customize the appearance by editing `style.css`. The extension uses CSS variables from SillyTavern's theme system for automatic theme compatibility.

## Compatibility

- **Requires**: SillyTavern 1.10.0 or higher
- **Works with**: All AI models (Claude, GPT, Llama, etc.)
- **Compatible with**: Most other SillyTavern extensions

## Troubleshooting

### Choices not appearing?
- Check that "Auto-generate choices" is enabled in settings
- Ensure the extension is properly installed and enabled

### Game state not saving?
- Check browser localStorage permissions
- Try exporting your save manually

### Style issues?
- Clear browser cache
- Ensure `style.css` is properly loaded
- Check for conflicts with other extensions

## Future Enhancements

Potential features for future versions:
- Quest/mission tracking system
- Statistics and achievements
- Combat system integration
- Skill/attribute tracking
- Party management for companions
- Map visualization interface
- Auto-parsing of AI responses for items/relationships

## Contributing

This is an open-source project. Feel free to:
- Report bugs or issues
- Suggest new features
- Submit pull requests
- Share your customizations

## License

MIT License - Feel free to modify and distribute

## Credits

Created for the SillyTavern community

---

**Enjoy your interactive RPG adventures!** 🎮✨
