# ==============================================================================
# BRICS-AETHER: Terraform Infrastructure Variables
# File: terraform/variables.tf
# ==============================================================================

variable "project_id" {
  description = "The Google Cloud project ID for BRICS-AETHER"
  type        = string
  default     = "brics-506015"
}

variable "primary_region" {
  description = "Primary deployment region for central services and dispatch engine"
  type        = string
  default     = "asia-south1" # Mumbai, India
}

variable "secondary_region" {
  description = "Secondary failover region for high availability"
  type        = string
  default     = "southamerica-east1" # São Paulo, Brazil
}

variable "environment" {
  description = "Deployment environment (pilot, staging, prod)"
  type        = string
  default     = "pilot"
}

# ------------------------------------------------------------------------------
# 11 Sovereign Member States Regional Mapping
# ------------------------------------------------------------------------------
variable "sovereign_regions" {
  description = "Regional data boundary configuration for all 11 BRICS+ sovereign members"
  type = map(object({
    country_name    = string
    gcp_region      = string
    storage_class   = string
    compliance_spec = string
  }))
  default = {
    "IN" = {
      country_name    = "India"
      gcp_region      = "asia-south1"
      storage_class   = "STANDARD"
      compliance_spec = "DPDP-2023"
    }
    "BR" = {
      country_name    = "Brazil"
      gcp_region      = "southamerica-east1"
      storage_class   = "STANDARD"
      compliance_spec = "LGPD-13709"
    }
    "CN" = {
      country_name    = "China"
      gcp_region      = "asia-east2"
      storage_class   = "STANDARD"
      compliance_spec = "PIPL-2021"
    }
    "RU" = {
      country_name    = "Russia"
      gcp_region      = "europe-north1"
      storage_class   = "STANDARD"
      compliance_spec = "152-FZ"
    }
    "ZA" = {
      country_name    = "South Africa"
      gcp_region      = "africa-south1"
      storage_class   = "STANDARD"
      compliance_spec = "POPIA-2013"
    }
    "EG" = {
      country_name    = "Egypt"
      gcp_region      = "me-central1"
      storage_class   = "STANDARD"
      compliance_spec = "Data-Protection-151"
    }
    "ET" = {
      country_name    = "Ethiopia"
      gcp_region      = "africa-south1"
      storage_class   = "STANDARD"
      compliance_spec = "Proclamation-1205"
    }
    "IR" = {
      country_name    = "Iran"
      gcp_region      = "me-central1"
      storage_class   = "STANDARD"
      compliance_spec = "E-Commerce-Act-32"
    }
    "SA" = {
      country_name    = "Saudi Arabia"
      gcp_region      = "me-central2"
      storage_class   = "STANDARD"
      compliance_spec = "PDPL-M19"
    }
    "AE" = {
      country_name    = "United Arab Emirates"
      gcp_region      = "me-central1"
      storage_class   = "STANDARD"
      compliance_spec = "Federal-Law-45"
    }
    "ID" = {
      country_name    = "Indonesia"
      gcp_region      = "asia-southeast2"
      storage_class   = "STANDARD"
      compliance_spec = "PDP-Law-27"
    }
  }
}

# ------------------------------------------------------------------------------
# Cloud Run Scaling & Performance Settings
# ------------------------------------------------------------------------------
variable "cloud_run_min_instances" {
  description = "Minimum instances for Cloud Run (0 for scale-to-zero cost efficiency)"
  type        = number
  default     = 0
}

variable "cloud_run_max_instances" {
  description = "Maximum burst instances for high-throughput citizen spikes"
  type        = number
  default     = 1000
}

variable "cloud_run_concurrency" {
  description = "Concurrent requests per Cloud Run container instance"
  type        = number
  default     = 80
}

# ------------------------------------------------------------------------------
# Cloud SQL (PostgreSQL SHA-256 Ledger) Settings
# ------------------------------------------------------------------------------
variable "db_instance_tier" {
  description = "Database instance tier for Cloud SQL PostgreSQL ledger"
  type        = string
  default     = "db-custom-4-16384"
}

variable "db_name" {
  description = "Cloud SQL database name"
  type        = string
  default     = "aether_dispute_ledger"
}

# ------------------------------------------------------------------------------
# Confidential Space TEE Settings
# ------------------------------------------------------------------------------
variable "confidential_vm_type" {
  description = "Confidential VM machine type with AMD SEV-SNP support for PINN inference"
  type        = string
  default     = "n2d-standard-8"
}
