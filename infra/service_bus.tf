resource "azurerm_servicebus_namespace" "main" {
  name                = local.service_bus_namespace_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "Standard"
  tags                = local.common_tags
}

resource "azurerm_servicebus_queue" "churn_detection_jobs" {
  name         = "churn-detection-jobs"
  namespace_id = azurerm_servicebus_namespace.main.id

  max_size_in_megabytes = 1024
  lock_duration         = "PT5M"
  max_delivery_count    = 10
}
