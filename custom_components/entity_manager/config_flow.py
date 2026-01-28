"""Config flow for Entity Manager integration."""
from homeassistant.config_entries import ConfigFlow

from .const import DOMAIN


class EntityManagerConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Entity Manager."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Handle the initial step."""
        if user_input is not None:
            # Prevent duplicate entries
            await self.async_set_unique_id(DOMAIN)
            self._abort_if_unique_id_configured()
            return self.async_create_entry(title="Entity Manager", data={})

        return self.async_show_form(step_id="user")
