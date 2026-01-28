"""WebSocket API for Entity Manager."""
import logging
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er

_LOGGER = logging.getLogger(__name__)


@callback
def async_setup_ws_api(hass: HomeAssistant) -> None:
    """Set up the WebSocket API."""
    websocket_api.async_register_command(hass, handle_get_disabled_entities)
    websocket_api.async_register_command(hass, handle_enable_entity)
    websocket_api.async_register_command(hass, handle_disable_entity)
    websocket_api.async_register_command(hass, handle_bulk_enable)
    websocket_api.async_register_command(hass, handle_bulk_disable)
    websocket_api.async_register_command(hass, handle_rename_entity)
    websocket_api.async_register_command(hass, handle_bulk_rename)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/get_disabled_entities",
        vol.Optional("state", default="disabled"): vol.In(["disabled", "enabled", "all"]),
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_get_disabled_entities(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle get disabled entities request."""
    entity_reg = er.async_get(hass)
    state = msg.get("state", "disabled")

    grouped_data: dict[str, Any] = {}

    for entity in entity_reg.entities.values():
        is_disabled = bool(entity.disabled)
        include_entity = (
            state == "all"
            or (state == "disabled" and is_disabled)
            or (state == "enabled" and not is_disabled)
        )

        platform = entity.platform or "unknown"
        device_id = entity.device_id or "no_device"

        if platform not in grouped_data:
            grouped_data[platform] = {
                "integration": platform,
                "devices": {},
                "total_entities": 0,
                "disabled_entities": 0,
            }

        integration_entry = grouped_data[platform]
        integration_entry["total_entities"] += 1
        if is_disabled:
            integration_entry["disabled_entities"] += 1

        devices = integration_entry["devices"]
        if device_id not in devices:
            devices[device_id] = {
                "device_id": device_id if device_id != "no_device" else None,
                "entities": [],
                "total_entities": 0,
                "disabled_entities": 0,
            }

        device_entry = devices[device_id]
        device_entry["total_entities"] += 1
        if is_disabled:
            device_entry["disabled_entities"] += 1

        if include_entity:
            device_entry["entities"].append(
                {
                    "entity_id": entity.entity_id,
                    "platform": platform,
                    "device_id": entity.device_id,
                    "disabled_by": entity.disabled_by.value if entity.disabled_by else None,
                    "name": entity.name,
                    "original_name": entity.original_name,
                    "entity_category": entity.entity_category.value if entity.entity_category else None,
                    "is_disabled": is_disabled,
                }
            )

    # Prune devices and integrations with no matching entities
    filtered_integrations = []
    for integration in grouped_data.values():
        filtered_devices = {
            device_id: device
            for device_id, device in integration["devices"].items()
            if device["entities"]
        }
        if not filtered_devices:
            continue
        integration["devices"] = filtered_devices
        filtered_integrations.append(integration)

    connection.send_result(msg["id"], filtered_integrations)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/enable_entity",
        vol.Required("entity_id"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_enable_entity(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle enable entity request."""
    entity_reg = er.async_get(hass)
    entity_id = msg["entity_id"]
    
    try:
        entity_reg.async_update_entity(entity_id, disabled_by=None)
        connection.send_result(msg["id"], {"success": True})
    except Exception as err:
        _LOGGER.error("Error enabling entity %s: %s", entity_id, err)
        connection.send_error(msg["id"], "enable_failed", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/disable_entity",
        vol.Required("entity_id"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_disable_entity(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle disable entity request."""
    entity_reg = er.async_get(hass)
    entity_id = msg["entity_id"]
    
    try:
        entity_reg.async_update_entity(entity_id, disabled_by=er.RegistryEntryDisabler.USER)
        connection.send_result(msg["id"], {"success": True})
    except Exception as err:
        _LOGGER.error("Error disabling entity %s: %s", entity_id, err)
        connection.send_error(msg["id"], "disable_failed", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/bulk_enable",
        vol.Required("entity_ids"): [str],
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_bulk_enable(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle bulk enable request."""
    entity_reg = er.async_get(hass)
    entity_ids = msg["entity_ids"]
    
    results = {"success": [], "failed": []}
    
    for entity_id in entity_ids:
        try:
            entity_reg.async_update_entity(entity_id, disabled_by=None)
            results["success"].append(entity_id)
        except Exception as err:
            _LOGGER.error("Error enabling entity %s: %s", entity_id, err)
            results["failed"].append({"entity_id": entity_id, "error": str(err)})
    
    connection.send_result(msg["id"], results)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/bulk_disable",
        vol.Required("entity_ids"): [str],
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_bulk_disable(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle bulk disable request."""
    entity_reg = er.async_get(hass)
    entity_ids = msg["entity_ids"]

    results = {"success": [], "failed": []}

    for entity_id in entity_ids:
        try:
            entity_reg.async_update_entity(entity_id, disabled_by=er.RegistryEntryDisabler.USER)
            results["success"].append(entity_id)
        except Exception as err:
            _LOGGER.error("Error disabling entity %s: %s", entity_id, err)
            results["failed"].append({"entity_id": entity_id, "error": str(err)})

    connection.send_result(msg["id"], results)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/rename_entity",
        vol.Required("entity_id"): str,
        vol.Optional("name"): vol.Any(str, None),
        vol.Optional("new_entity_id"): str,
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_rename_entity(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle rename entity request.

    Supports renaming the friendly name (name) and/or the entity ID (new_entity_id).
    Pass name=None to reset the friendly name back to the integration default.
    """
    entity_reg = er.async_get(hass)
    entity_id = msg["entity_id"]

    try:
        kwargs: dict[str, Any] = {}
        if "name" in msg:
            kwargs["name"] = msg["name"]
        if "new_entity_id" in msg:
            kwargs["new_entity_id"] = msg["new_entity_id"]

        if not kwargs:
            connection.send_error(msg["id"], "no_changes", "No rename parameters provided")
            return

        entity_reg.async_update_entity(entity_id, **kwargs)
        connection.send_result(msg["id"], {"success": True})
    except Exception as err:
        _LOGGER.error("Error renaming entity %s: %s", entity_id, err)
        connection.send_error(msg["id"], "rename_failed", str(err))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "entity_manager/bulk_rename",
        vol.Required("entity_ids"): [str],
        vol.Required("find"): str,
        vol.Required("replace"): str,
        vol.Optional("target", default="name"): vol.In(["name", "entity_id"]),
    }
)
@websocket_api.require_admin
@websocket_api.async_response
async def handle_bulk_rename(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Handle bulk rename request using find/replace.

    Applies a text find/replace across the selected entities.
    target="name" replaces in the friendly name.
    target="entity_id" replaces in the object_id portion only (after the domain.).
    """
    entity_reg = er.async_get(hass)
    entity_ids = msg["entity_ids"]
    find_str = msg["find"]
    replace_str = msg["replace"]
    target = msg.get("target", "name")

    if not find_str:
        connection.send_error(msg["id"], "invalid_find", "Find string cannot be empty")
        return

    results: dict[str, list] = {"success": [], "failed": [], "skipped": []}

    # For entity_id renames, pre-compute the full rename map and check for
    # collisions before applying any changes.
    if target == "entity_id":
        rename_map: dict[str, str] = {}
        for entity_id in entity_ids:
            entity_entry = entity_reg.async_get(entity_id)
            if entity_entry is None:
                results["failed"].append({"entity_id": entity_id, "error": "Entity not found"})
                continue

            # Only replace within the object_id (part after domain.)
            domain, object_id = entity_id.split(".", 1)
            if find_str not in object_id:
                results["skipped"].append(entity_id)
                continue
            new_object_id = object_id.replace(find_str, replace_str)
            new_id = f"{domain}.{new_object_id}"
            if new_id == entity_id:
                results["skipped"].append(entity_id)
                continue
            rename_map[entity_id] = new_id

        # Check for collisions: target ID already exists or duplicates in batch
        seen_targets: set[str] = set()
        collision_ids: list[str] = []
        for old_id, new_id in rename_map.items():
            existing = entity_reg.async_get(new_id)
            # Allow if the existing entry is another entity being renamed away
            if existing is not None and existing.entity_id not in rename_map:
                collision_ids.append(old_id)
            elif new_id in seen_targets:
                collision_ids.append(old_id)
            else:
                seen_targets.add(new_id)

        for coll_id in collision_ids:
            target_id = rename_map.pop(coll_id)
            results["failed"].append(
                {"entity_id": coll_id, "error": f"Target '{target_id}' already exists or conflicts"}
            )

        # Apply validated renames
        for old_id, new_id in rename_map.items():
            try:
                entity_reg.async_update_entity(old_id, new_entity_id=new_id)
                results["success"].append({"entity_id": old_id, "new_entity_id": new_id})
            except Exception as err:
                _LOGGER.error("Error renaming entity %s -> %s: %s", old_id, new_id, err)
                results["failed"].append({"entity_id": old_id, "error": str(err)})

    elif target == "name":
        for entity_id in entity_ids:
            try:
                entity_entry = entity_reg.async_get(entity_id)
                if entity_entry is None:
                    results["failed"].append({"entity_id": entity_id, "error": "Entity not found"})
                    continue

                current_name = (
                    entity_entry.name
                    or entity_entry.original_name
                    or entity_id.split(".", 1)[1].replace("_", " ")
                )
                if find_str not in current_name:
                    results["skipped"].append(entity_id)
                    continue
                new_name = current_name.replace(find_str, replace_str)
                entity_reg.async_update_entity(entity_id, name=new_name)
                results["success"].append({"entity_id": entity_id, "old_name": current_name, "new_name": new_name})

            except Exception as err:
                _LOGGER.error("Error renaming entity %s: %s", entity_id, err)
                results["failed"].append({"entity_id": entity_id, "error": str(err)})

    connection.send_result(msg["id"], results)
