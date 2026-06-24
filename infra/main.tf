data "azurerm_client_config" "current" {}

resource "random_string" "suffix" {
  length  = 4
  special = false
  upper   = false
}

locals {
  suffix = random_string.suffix.result

  resource_group_name            = "rg-apex-churn-poc"
  log_analytics_workspace_name   = "${var.resource_prefix}-law-${local.suffix}"
  application_insights_name      = "${var.resource_prefix}-ai-${local.suffix}"
  storage_account_name           = "apexchurnst${local.suffix}"
  cosmos_account_name            = "${var.resource_prefix}-cosmos-${local.suffix}"
  key_vault_name                 = "${var.resource_prefix}-kv-${local.suffix}"
  service_bus_namespace_name     = "${var.resource_prefix}-sb-${local.suffix}"
  event_grid_topic_name          = "${var.resource_prefix}-eg-${local.suffix}"
  app_service_plan_name          = "${var.resource_prefix}-asp-${local.suffix}"
  function_app_name              = "${var.resource_prefix}-func-${local.suffix}"
  static_web_app_name            = "${var.resource_prefix}-ui-${local.suffix}"
  communication_service_name     = "${var.resource_prefix}-comm-${local.suffix}"
  email_communication_service_name = "${var.resource_prefix}-email-${local.suffix}"

  common_tags = {
    project     = "apex-churn-poc"
    environment = var.environment
    managed_by  = "terraform"
  }
}
