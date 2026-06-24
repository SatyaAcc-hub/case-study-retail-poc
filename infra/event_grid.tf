resource "azurerm_eventgrid_topic" "main" {
  name                = "${var.resource_prefix}-events"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.common_tags
}
