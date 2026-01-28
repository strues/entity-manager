"""Services for the Entity Manager integration."""
import logging

from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import entity_registry as er

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

SERVICE_ENABLE_ENTITY = "enable_entity"
SERVICE_DISABLE_ENTITY = "disable_entity"
SERVICE_RENAME_ENTITY = "rename_entity"


async def async_setup_services(hass: HomeAssistant) -> None:
    """Set up services for the Entity Manager integration."""

    # Check if services are already registered
    if hass.services.has_service(DOMAIN, SERVICE_ENABLE_ENTITY):
        _LOGGER.debug("Services already registered, skipping")
        return

    async def async_enable_entity(call: ServiceCall) -> None:
        """Enable an entity."""
        entity_id = call.data.get("entity_id")
        registry = er.async_get(hass)

        if entity_id:
            entry = registry.async_get(entity_id)
            if entry:
                registry.async_update_entity(
                    entity_id, disabled_by=None
                )
                _LOGGER.info("Enabled entity: %s", entity_id)
            else:
                _LOGGER.error("Entity not found: %s", entity_id)
        else:
            _LOGGER.error("No entity_id provided")

    async def async_disable_entity(call: ServiceCall) -> None:
        """Disable an entity."""
        entity_id = call.data.get("entity_id")
        registry = er.async_get(hass)

        if entity_id:
            entry = registry.async_get(entity_id)
            if entry:
                registry.async_update_entity(
                    entity_id, disabled_by=er.RegistryEntryDisabler.USER
                )
                _LOGGER.info("Disabled entity: %s", entity_id)
            else:
                _LOGGER.error("Entity not found: %s", entity_id)
        else:
            _LOGGER.error("No entity_id provided")

    async def async_rename_entity(call: ServiceCall) -> None:
        """Rename an entity's friendly name and/or entity ID."""
        entity_id = call.data.get("entity_id")
        name = call.data.get("name")
        new_entity_id = call.data.get("new_entity_id")
        registry = er.async_get(hass)

        if not entity_id:
            _LOGGER.error("No entity_id provided")
            return

        entry = registry.async_get(entity_id)
        if not entry:
            _LOGGER.error("Entity not found: %s", entity_id)
            return

        kwargs = {}
        if name is not None:
            kwargs["name"] = name
        if new_entity_id is not None:
            # Validate the target doesn't already exist
            existing = registry.async_get(new_entity_id)
            if existing is not None:
                _LOGGER.error(
                    "Cannot rename %s -> %s: target already exists",
                    entity_id, new_entity_id,
                )
                return
            kwargs["new_entity_id"] = new_entity_id

        if kwargs:
            try:
                registry.async_update_entity(entity_id, **kwargs)
                _LOGGER.info("Renamed entity %s: %s", entity_id, kwargs)
            except ValueError as err:
                _LOGGER.error("Failed to rename entity %s: %s", entity_id, err)
            except Exception as err:
                _LOGGER.error("Unexpected error renaming entity %s: %s", entity_id, err)

    hass.services.async_register(
        DOMAIN, SERVICE_ENABLE_ENTITY, async_enable_entity
    )
    hass.services.async_register(
        DOMAIN, SERVICE_DISABLE_ENTITY, async_disable_entity
    )
    hass.services.async_register(
        DOMAIN, SERVICE_RENAME_ENTITY, async_rename_entity
    )
