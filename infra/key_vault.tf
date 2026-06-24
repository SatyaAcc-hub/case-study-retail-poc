resource "azurerm_key_vault" "main" {
  name                        = local.key_vault_name
  location                    = azurerm_resource_group.main.location
  resource_group_name         = azurerm_resource_group.main.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = "standard"
  soft_delete_retention_days  = 7
  purge_protection_enabled    = false
  tags                        = local.common_tags
}

resource "azurerm_key_vault_access_policy" "deployer" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = data.azurerm_client_config.current.object_id

  secret_permissions = [
    "Backup",
    "Delete",
    "Get",
    "List",
    "Purge",
    "Recover",
    "Restore",
    "Set",
  ]
}

resource "azurerm_key_vault_access_policy" "function_app" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_linux_function_app.main.identity[0].principal_id

  secret_permissions = [
    "Get",
    "List",
  ]
}

resource "azurerm_key_vault_secret" "aws_access_key_id" {
  name         = "aws-access-key-id"
  value        = "REPLACE_ME"
  key_vault_id = azurerm_key_vault.main.id
  depends_on   = [azurerm_key_vault_access_policy.deployer]
}

resource "azurerm_key_vault_secret" "aws_secret_access_key" {
  name         = "aws-secret-access-key"
  value        = "REPLACE_ME"
  key_vault_id = azurerm_key_vault.main.id
  depends_on   = [azurerm_key_vault_access_policy.deployer]
}

resource "azurerm_key_vault_secret" "aws_region" {
  name         = "aws-region"
  value        = "us-east-1"
  key_vault_id = azurerm_key_vault.main.id
  depends_on   = [azurerm_key_vault_access_policy.deployer]
}

resource "azurerm_key_vault_secret" "bedrock_sonnet_model" {
  name         = "bedrock-sonnet-model"
  value        = "anthropic.claude-sonnet-4-5-20250929-v1:0"
  key_vault_id = azurerm_key_vault.main.id
  depends_on   = [azurerm_key_vault_access_policy.deployer]
}

resource "azurerm_key_vault_secret" "bedrock_haiku_model" {
  name         = "bedrock-haiku-model"
  value        = "anthropic.claude-haiku-4-5-20251001-v1:0"
  key_vault_id = azurerm_key_vault.main.id
  depends_on   = [azurerm_key_vault_access_policy.deployer]
}
