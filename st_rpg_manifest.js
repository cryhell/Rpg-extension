{
  "name": "SillyTavern RPG Extension",
  "version": "1.0.0",
  "display_name": "Interactive Story RPG",
  "description": "Transform SillyTavern into a fully-fledged RPG with choices, relationships, inventory, and world tracking",
  "author": "Your Name",
  "requires": ["SillyTavern >= 1.10.0"],
  "js": "index.js",
  "css": "style.css",
  "settings": [
    {
      "id": "auto_generate_choices",
      "type": "checkbox",
      "label": "Auto-generate choices after each response",
      "default": true
    },
    {
      "id": "num_choices",
      "type": "number",
      "label": "Number of choices to generate",
      "default": 4,
      "min": 2,
      "max": 6
    },
    {
      "id": "enable_time_tracking",
      "type": "checkbox",
      "label": "Enable world time tracking",
      "default": true
    },
    {
      "id": "time_progression_rate",
      "type": "number",
      "label": "Minutes passed per action",
      "default": 30,
      "min": 1,
      "max": 1440
    }
  ]
}