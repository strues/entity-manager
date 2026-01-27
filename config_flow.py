"""Config flow for Entity Manager integration."""
import logging
from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers import config_validation as cv
from homeassistant.data_entry_flow import FlowResult

_LOGGER = logging.getLogger(__name__)

DOMAIN = "entity_manager"


class EntityManagerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Config flow for Entity Manager."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Handle a flow initialized by the user."""
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()

        if user_input is not None:
            return self.async_create_entry(title="Entity Manager", data={})

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({}),
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: config_entries.ConfigEntry) -> config_entries.OptionsFlow:
        """Get the options flow for this config entry."""
        return EntityManagerOptionsFlow(config_entry)


class EntityManagerOptionsFlow(config_entries.OptionsFlow):
    """Options flow for Entity Manager."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Manage the options."""
        if user_input is not None:
            # Update the config entry options
            return self.async_create_entry(title="", data=user_input)

        # Get all available integrations from config entries
        integrations = {}
        for entry in self.hass.config_entries.async_entries():
            if entry.domain != DOMAIN:  # Exclude entity_manager itself
                display_name = entry.title or entry.domain.replace("_", " ").title()
                integrations[entry.domain] = display_name
        
        # Sort integrations alphabetically by display name
        sorted_integrations = dict(sorted(integrations.items(), key=lambda x: x[1]))
        
        # Get currently selected integrations from options
        current_integrations = self.config_entry.options.get("managed_integrations", [])

        data_schema = vol.Schema(
            {
                vol.Optional(
                    "managed_integrations",
                    default=current_integrations,
                ): cv.multi_select(sorted_integrations),
            }
        )

        return self.async_show_form(
            step_id="init",
            data_schema=data_schema,
        )
