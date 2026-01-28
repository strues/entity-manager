"""Entity Manager Integration."""
import logging
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.components import frontend
from homeassistant.helpers import entity_registry as er

from .websocket_api import async_setup_ws_api
from .voice_assistant import async_setup_intents

_LOGGER = logging.getLogger(__name__)

DOMAIN = "entity_manager"

SERVICE_ENABLE_ENTITY = "enable_entity"
SERVICE_DISABLE_ENTITY = "disable_entity"
SERVICE_RENAME_ENTITY = "rename_entity"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the Entity Manager component."""
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Entity Manager from a config entry."""
    
    # Register WebSocket API
    async_setup_ws_api(hass)

    # Set up voice assistant intents
    await async_setup_intents(hass)

    # Register services
    entity_reg = er.async_get(hass)

    async def handle_enable_entity(call):
        """Handle enable entity service call."""
        entity_id = call.data.get("entity_id")
        if entity_id:
            try:
                entity_reg.async_update_entity(entity_id, disabled_by=None)
                _LOGGER.info("Enabled entity: %s", entity_id)
            except ValueError as err:
                _LOGGER.error("Failed to enable entity %s: %s", entity_id, err)
            except Exception as err:
                _LOGGER.error("Unexpected error enabling entity %s: %s", entity_id, err)

    async def handle_disable_entity(call):
        """Handle disable entity service call."""
        entity_id = call.data.get("entity_id")
        if entity_id:
            try:
                entity_reg.async_update_entity(
                    entity_id, 
                    disabled_by=er.RegistryEntryDisabler.USER
                )
                _LOGGER.info("Disabled entity: %s", entity_id)
            except ValueError as err:
                _LOGGER.error("Failed to disable entity %s: %s", entity_id, err)
            except Exception as err:
                _LOGGER.error("Unexpected error disabling entity %s: %s", entity_id, err)

    hass.services.async_register(
        DOMAIN,
        SERVICE_ENABLE_ENTITY,
        handle_enable_entity,
    )

    hass.services.async_register(
        DOMAIN,
        SERVICE_DISABLE_ENTITY,
        handle_disable_entity,
    )

    async def handle_rename_entity(call):
        """Handle rename entity service call."""
        entity_id = call.data.get("entity_id")
        name = call.data.get("name")
        new_entity_id = call.data.get("new_entity_id")
        if entity_id:
            try:
                kwargs = {}
                if name is not None:
                    kwargs["name"] = name
                if new_entity_id is not None:
                    kwargs["new_entity_id"] = new_entity_id
                if kwargs:
                    entity_reg.async_update_entity(entity_id, **kwargs)
                    _LOGGER.info("Renamed entity %s: %s", entity_id, kwargs)
            except ValueError as err:
                _LOGGER.error("Failed to rename entity %s: %s", entity_id, err)
            except Exception as err:
                _LOGGER.error("Unexpected error renaming entity %s: %s", entity_id, err)

    hass.services.async_register(
        DOMAIN,
        SERVICE_RENAME_ENTITY,
        handle_rename_entity,
    )

    # Register the sidebar panel
    frontend.async_register_built_in_panel(
        hass,
        component_name="custom",
        sidebar_title="Entity Manager",
        sidebar_icon="mdi:tune",
        frontend_url_path=DOMAIN,
        config={
            "_panel_custom": {
                "name": "entity-manager-panel",
                "embed_iframe": True,
                "trust_external": False,
                "js_url": f"/{DOMAIN}/entity-manager-panel.js",
            }
        },
        require_admin=True,
    )

    _LOGGER.info("Entity Manager panel registered")
    
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    frontend.async_remove_panel(hass, DOMAIN)
    return True
