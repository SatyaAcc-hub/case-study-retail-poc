resource "azurerm_service_plan" "main" {
  name                = local.app_service_plan_name
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = "Y1"
  tags                = local.common_tags
}

resource "azurerm_linux_function_app" "main" {
  name                       = local.function_app_name
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  service_plan_id            = azurerm_service_plan.main.id
  storage_account_name       = azurerm_storage_account.functions.name
  storage_account_access_key = azurerm_storage_account.functions.primary_access_key

  identity {
    type = "SystemAssigned"
  }

  app_settings = {
    WEBSITE_RUN_FROM_PACKAGE = "1"

    AzureWebJobsStorage = azurerm_storage_account.functions.primary_connection_string

    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.main.connection_string

    COSMOS_DB_ENDPOINT = azurerm_cosmosdb_account.main.endpoint

    SERVICE_BUS_CONNECTION_STRING = azurerm_servicebus_namespace.main.default_primary_connection_string

    AWS_ACCESS_KEY_ID = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.main.vault_uri}secrets/aws-access-key-id/)"

    AWS_SECRET_ACCESS_KEY = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.main.vault_uri}secrets/aws-secret-access-key/)"

    AWS_REGION = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.main.vault_uri}secrets/aws-region/)"

    BEDROCK_SONNET_MODEL = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.main.vault_uri}secrets/bedrock-sonnet-model/)"

    BEDROCK_HAIKU_MODEL = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault.main.vault_uri}secrets/bedrock-haiku-model/)"
  }

  site_config {
    application_stack {
      node_version = "20"
    }
  }

  tags = local.common_tags

  depends_on = [azurerm_key_vault_access_policy.deployer]
}
