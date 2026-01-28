"""Services for the Entity Manager integration."""
import logging

import voluptuous as vol

from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import entity_registry as er

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

<<<<<<< Updated upstream
SERVICE_ENABLE_ENTITY = "enable_entity"
SERVICE_DISABLE_ENTITY = "disable_entity"
SERVICE_RENAME_ENTITY = "rename_entity"


async def async_setup_services(hass: HomeAssistant) -> None:
    """Set up services for the Entity Manager integration."""

    # Check if services are already registered
    if hass.services.has_service(DOMAIN, SERVICE_ENABLE_ENTITY):
        _LOGGER.debug("Services already registered, skipping")
        return

=======
SERVICE_ENABLE_ENTITY = "enable_entity"
SERVICE_DISABLE_ENTITY = "disable_entity"
SERVICE_BULK_RENAME = "bulk_rename"

BULK_RENAME_SCHEMA = vol.Schema(
    {
        vol.Required("renames"): vol.All(
            cv.ensure_list,
            [
                vol.Schema(
                    {
                        vol.Required("entity_id"): cv.entity_id,
                        vol.Required("new_entity_id"): cv.entity_id,
                    }
                )
            ],
        ),
        vol.Optional("dry_run", default=False): cv.boolean,
        vol.Optional("skip_missing", default=True): cv.boolean,
    }
)


async def async_setup_services(hass: HomeAssistant) -> None:
    """Set up services for the Entity Manager integration."""
    
    # Check if services are already registered
    if all(
        hass.services.has_service(DOMAIN, service)
        for service in (
            SERVICE_ENABLE_ENTITY,
            SERVICE_DISABLE_ENTITY,
            SERVICE_BULK_RENAME,
        )
    ):
        _LOGGER.debug("Services already registered, skipping")
        return
    
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream

    async def async_disable_entity(call: ServiceCall) -> None:
        """Disable an entity."""
        entity_id = call.data.get("entity_id")
        registry = er.async_get(hass)

=======
    
    async def async_disable_entity(call: ServiceCall) -> None:
        """Disable an entity."""
        entity_id = call.data.get("entity_id")
        registry = er.async_get(hass)
        
>>>>>>> Stashed changes
        if entity_id:
            entry = registry.async_get(entity_id)
            if entry:
                registry.async_update_entity(
                    entity_id, disabled_by=er.RegistryEntryDisabler.USER
                )
                _LOGGER.info("Disabled entity: %s", entity_id)
            else:
                _LOGGER.error("Entity not found: %s", entity_id)
<<<<<<< Updated upstream
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
=======
        else:
            _LOGGER.error("No entity_id provided")

    async def async_bulk_rename(call: ServiceCall) -> None:
        """Bulk rename entities in the registry."""
        registry = er.async_get(hass)
        renames = call.data["renames"]
        dry_run = call.data["dry_run"]
        skip_missing = call.data["skip_missing"]

        sources = [rename["entity_id"] for rename in renames]
        targets = [rename["new_entity_id"] for rename in renames]

        if len(set(sources)) != len(sources):
            _LOGGER.error("Duplicate entity_id values in renames; aborting")
            return

        if len(set(targets)) != len(targets):
            _LOGGER.error("Duplicate new_entity_id values in renames; aborting")
            return

        conflicts = [
            target
            for target in targets
            if registry.async_get(target) and target not in sources
        ]
        if conflicts:
            _LOGGER.error(
                "Rename targets already exist and are not being renamed: %s",
                ", ".join(conflicts),
            )
            return

        rename_map = {rename["entity_id"]: rename["new_entity_id"] for rename in renames}

        order: list[str] = []
        visit_state: dict[str, str] = {}

        def visit(entity_id: str) -> bool:
            state = visit_state.get(entity_id)
            if state == "visiting":
                return False
            if state == "visited":
                return True

            visit_state[entity_id] = "visiting"
            target = rename_map.get(entity_id)
            if target in rename_map:
                if not visit(target):
                    return False
            visit_state[entity_id] = "visited"
            order.append(entity_id)
            return True

        for entity_id in rename_map:
            if entity_id not in visit_state:
                if not visit(entity_id):
                    _LOGGER.error(
                        "Cyclic rename detected (e.g., swap); use a temporary name first"
                    )
                    return

        planned = []
        for entity_id in order:
            new_entity_id = rename_map[entity_id]
            entry = registry.async_get(entity_id)
            if not entry:
                if skip_missing:
                    _LOGGER.warning("Entity not found (skipping): %s", entity_id)
                    continue
                _LOGGER.error("Entity not found: %s", entity_id)
                return
            planned.append((entity_id, new_entity_id))

        if dry_run:
            for entity_id, new_entity_id in planned:
                _LOGGER.info("Dry run rename: %s -> %s", entity_id, new_entity_id)
            return

        for entity_id, new_entity_id in planned:
            try:
                registry.async_update_entity(entity_id, new_entity_id=new_entity_id)
                _LOGGER.info("Renamed entity: %s -> %s", entity_id, new_entity_id)
            except ValueError as err:
                _LOGGER.error("Failed to rename %s -> %s: %s", entity_id, new_entity_id, err)
    
    hass.services.async_register(
        DOMAIN, SERVICE_ENABLE_ENTITY, async_enable_entity
    )
    hass.services.async_register(
        DOMAIN, SERVICE_DISABLE_ENTITY, async_disable_entity
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_BULK_RENAME,
        async_bulk_rename,
        schema=BULK_RENAME_SCHEMA,
    )
>>>>>>> Stashed changes
