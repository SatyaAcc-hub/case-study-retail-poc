resource "azurerm_email_communication_service" "main" {
  name                = local.email_communication_service_name
  resource_group_name = azurerm_resource_group.main.name
  data_location       = "United States"
  tags                = local.common_tags
}

resource "azurerm_communication_service" "main" {
  name                = local.communication_service_name
  resource_group_name = azurerm_resource_group.main.name
  data_location       = "United States"
  tags                = local.common_tags
}
