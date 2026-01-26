# Entity Manager for Home Assistant

A custom HACS integration that provides a comprehensive interface to manage disabled entities across all your integrations and devices.

## Features

- 📊 **Organized View**: Browse disabled entities by integration → device → entity
- 🔍 **Search**: Quickly find entities, devices, or integrations
- ✅ **Bulk Actions**: Enable/disable multiple entities at once
- 📱 **Responsive UI**: Clean, modern interface that matches Home Assistant's design
- 🎯 **Smart Grouping**: See exactly which devices have disabled entities
- 🔄 **Real-time Updates**: Instant feedback when enabling/disabling entities

## Compatibility & Permissions

- Home Assistant 2024.1.0 or newer
- Admin user is required (panel and WebSocket commands enforce admin)
- No additional Python dependencies

## Why Use Entity Manager?

If you have integrations like Shelly devices that create many diagnostic entities (power, voltage, temperature, etc.), this tool makes it easy to:

- See all disabled entities in one place
- Enable diagnostic entities for specific devices
- Bulk enable/disable entities by device or integration
- Keep your entity list clean and organized

## Installation

### HACS (Recommended)

1. Open HACS in your Home Assistant instance
2. Click on "Integrations"
3. Click the three dots in the top right corner
4. Select "Custom repositories"
5. Add this repository URL and select "Integration" as the category
6. Click "Add"
7. Find "Entity Manager" in the integration list
8. Click "Download"
9. Restart Home Assistant

### Manual Installation

1. Copy the `custom_components/entity_manager` folder to your Home Assistant's `custom_components` directory
2. Restart Home Assistant

## Configuration

1. Go to **Settings** → **Devices & Services**
2. Click **Add Integration**
3. Search for "Entity Manager"
4. Click to add it

A new "Entity Manager" menu item will appear in your sidebar.

## Usage

### Main Interface

The Entity Manager panel shows:
- **Statistics**: Quick overview of integrations, devices, and disabled entities
- **Search Bar**: Filter by entity ID, device name, or integration
- **Integration Groups**: Expandable sections for each integration
- **Device Groups**: Nested sections showing devices within each integration
- **Entity List**: Individual entities with enable/disable controls

### Actions

- **Enable Selected**: Enable all checked entities
- **Disable Selected**: Disable all checked entities
- **Enable All (Integration)**: Enable all disabled entities for an integration
- **Enable All (Device)**: Enable all disabled entities for a specific device
- **Enable (Individual)**: Enable a single entity

### Tips

- Use checkboxes to select multiple entities across different devices
- Click integration/device headers to expand/collapse sections
- Search for "diagnostic" to find all diagnostic entities
- The "disabled by" badge shows whether the entity was disabled by user or integration

## Example Use Cases

### Shelly Devices
If you have Shelly devices with many diagnostic entities:
1. Expand the "shelly" integration
2. Find the device you want to monitor
3. Enable diagnostic entities like power, voltage, temperature
4. Leave other diagnostic entities disabled to keep your entity list clean

### Bulk Operations
To enable all diagnostic entities for specific devices:
1. Search for the device name
2. Click "Enable All" on the device header
3. Or select specific entities and use "Enable Selected"

## Screenshots

*(Coming soon)*

## Development

This integration consists of:
- **Backend**: Python WebSocket API for entity management
- **Frontend**: Vanilla JavaScript web component for the UI
- **Integration**: Proper Home Assistant integration structure

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License

## Support

If you encounter issues:
1. Check Home Assistant logs for errors
2. Open an issue on GitHub with:
   - Home Assistant version
   - Integration version
   - Error logs
   - Steps to reproduce

## Credits

Created for the Home Assistant community by those who love clean, organized entity lists! 🎉

## Changelog

### 0.1.0
- Initial release
- Basic entity management functionality
- Integration/device grouping
- Bulk enable/disable operations
- Search functionality
