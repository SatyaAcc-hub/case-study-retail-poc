output "resource_group_name" {
  description = "Name of the Azure Resource Group that contains all POC resources."
  value       = azurerm_resource_group.main.name
}

output "function_app_name" {
  description = "Name of the Azure Linux Function App."
  value       = azurerm_linux_function_app.main.name
}

output "function_app_url" {
  description = "Default hostname of the Function App (HTTPS endpoint)."
  value       = "https://${azurerm_linux_function_app.main.default_hostname}"
}

output "cosmos_db_endpoint" {
  description = "Cosmos DB account endpoint URI."
  value       = azurerm_cosmosdb_account.main.endpoint
}

output "cosmos_db_name" {
  description = "Name of the Cosmos DB SQL database."
  value       = azurerm_cosmosdb_sql_database.main.name
}

output "key_vault_uri" {
  description = "URI of the Azure Key Vault."
  value       = azurerm_key_vault.main.vault_uri
}

output "static_web_app_url" {
  description = "Default hostname of the Static Web App."
  value       = "https://${azurerm_static_web_app.main.default_host_name}"
}

output "static_web_app_api_key" {
  description = "Deployment API key for the Static Web App. Required by CI/CD pipelines."
  value       = azurerm_static_web_app.main.api_key
  sensitive   = true
}

output "service_bus_namespace" {
  description = "Name of the Service Bus namespace."
  value       = azurerm_servicebus_namespace.main.name
}

output "event_grid_topic_endpoint" {
  description = "Endpoint URL of the Event Grid topic."
  value       = azurerm_eventgrid_topic.main.endpoint
}

output "event_grid_topic_key" {
  description = "Primary access key for the Event Grid topic."
  value       = azurerm_eventgrid_topic.main.primary_access_key
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "Application Insights connection string used by the Function App for telemetry."
  value       = azurerm_application_insights.main.connection_string
  sensitive   = true
}
