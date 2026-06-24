variable "resource_prefix" {
  type        = string
  default     = "apex-churn"
  description = "Prefix used for naming all resources in this deployment."
}

variable "location" {
  type        = string
  default     = "eastus"
  description = "Azure region where all resources will be deployed."
}

variable "environment" {
  type        = string
  default     = "poc"
  description = "Deployment environment label (e.g. poc, dev, prod)."
}

variable "tf_state_resource_group" {
  type        = string
  default     = "rg-apex-churn-tfstate"
  description = "Resource group that contains the Terraform remote state storage account."
}

variable "tf_state_storage_account" {
  type        = string
  default     = "apexchurntfstate"
  description = "Storage account name used to store Terraform remote state."
}

variable "tf_state_container" {
  type        = string
  default     = "tfstate"
  description = "Blob container inside the state storage account that holds the state file."
}

variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region used when calling Amazon Bedrock from the Function App."
}

variable "cosmos_db_name" {
  type        = string
  default     = "apex-retail-poc"
  description = "Name of the Cosmos DB SQL database that holds all application containers."
}
