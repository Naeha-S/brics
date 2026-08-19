# ==============================================================================
# BRICS-AETHER: Core Cloud Infrastructure as Code (IaC)
# File: terraform/main.tf
# Platform: Google Cloud Platform (GCP)
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.30.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.primary_region
}

# ------------------------------------------------------------------------------
# 1. Enable Required GCP Service APIs
# ------------------------------------------------------------------------------
resource "google_project_service" "enabled_apis" {
  for_each = toset([
    "run.googleapis.com",
    "pubsub.googleapis.com",
    "bigquery.googleapis.com",
    "sqladmin.googleapis.com",
    "cloudtasks.googleapis.com",
    "secretmanager.googleapis.com",
    "confidentialcomputing.googleapis.com",
    "aiplatform.googleapis.com",
    "compute.googleapis.com",
    "iam.googleapis.com",
    "earthengine.googleapis.com"
  ])
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# ------------------------------------------------------------------------------
# 2. Multi-Region Sovereign Storage Buckets (11 BRICS+ Nations)
# Enforces strict data residency & sovereignty (DPDP, LGPD, PIPL, POPIA, 152-FZ)
# ------------------------------------------------------------------------------
resource "google_storage_bucket" "sovereign_buckets" {
  for_each                    = var.sovereign_regions
  name                        = "brics-aether-sovereign-${lower(each.key)}-${var.project_id}"
  location                    = each.value.gcp_region
  storage_class               = each.value.storage_class
  uniform_bucket_level_access = true
  force_destroy               = false

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      target_storage_class = "NEARLINE"
    }
  }

  labels = {
    sovereignty_country = lower(each.key)
    compliance_standard = lower(replace(each.value.compliance_spec, "_", "-"))
    managed_by          = "terraform"
    system              = "brics-aether"
  }

  depends_on = [google_project_service.enabled_apis]
}

# ------------------------------------------------------------------------------
# 3. High-Throughput Streaming Pub/Sub Engine (>100k/s msg throughput)
# ------------------------------------------------------------------------------
resource "google_pubsub_topic" "telemetry_stream_topic" {
  name = "brics-telemetry-stream-topic"

  message_retention_duration = "86400s" # 24 Hours

  labels = {
    pipeline   = "ingestion"
    throughput = "high"
  }

  depends_on = [google_project_service.enabled_apis]
}

resource "google_pubsub_topic" "dispute_events_topic" {
  name = "brics-dispute-events-topic"

  message_retention_duration = "604800s" # 7 Days

  labels = {
    pipeline = "dispute-ledger"
  }

  depends_on = [google_project_service.enabled_apis]
}

resource "google_pubsub_topic" "dead_letter_topic" {
  name = "brics-dead-letter-topic"

  depends_on = [google_project_service.enabled_apis]
}

# BigQuery Direct Streaming Subscription
resource "google_pubsub_subscription" "bq_telemetry_subscription" {
  name  = "brics-bq-telemetry-subscription"
  topic = google_pubsub_topic.telemetry_stream_topic.id

  ack_deadline_seconds = 60

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dead_letter_topic.id
    max_delivery_attempts = 5
  }

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  depends_on = [google_pubsub_topic.telemetry_stream_topic]
}

# ------------------------------------------------------------------------------
# 4. BigQuery GIS Analytical & Mart Datasets
# ------------------------------------------------------------------------------
resource "google_bigquery_dataset" "bq_raw" {
  dataset_id                  = "raw"
  friendly_name               = "BRICS AETHER Raw Ingestion Telemetry"
  description                 = "Raw ingestion tables for Sentinel-5P, CAMS, ERA5, and Citizen ground observations"
  location                    = "asia-south1"
  default_table_expiration_ms = 7776000000 # 90 Days

  labels = {
    tier = "raw"
  }

  depends_on = [google_project_service.enabled_apis]
}

resource "google_bigquery_dataset" "bq_mart" {
  dataset_id    = "mart"
  friendly_name = "BRICS AETHER Analytical Marts & Dispatch Views"
  description   = "Materialized views, H3 spatial intersections, and Primary Owner election mart"
  location      = "asia-south1"

  labels = {
    tier = "mart"
  }

  depends_on = [google_project_service.enabled_apis]
}

# ------------------------------------------------------------------------------
# 5. Cloud SQL for PostgreSQL 15 (Immutable SHA-256 Dispute Ledger)
# ------------------------------------------------------------------------------
resource "random_password" "db_password" {
  length  = 24
  special = false
}

resource "google_sql_database_instance" "postgres_ledger" {
  name             = "brics-aether-ledger-${var.environment}"
  database_version = "POSTGRES_15"
  region           = var.primary_region

  settings {
    tier              = var.db_instance_tier
    availability_type = "REGIONAL"
    disk_size         = 100
    disk_type         = "PD_SSD"
    disk_autoresize   = true

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "02:00"
    }

    ip_configuration {
      ipv4_enabled    = true
      require_ssl     = true
    }

    database_flags {
      name  = "log_connections"
      value = "on"
    }
    database_flags {
      name  = "log_disconnections"
      value = "on"
    }
  }

  deletion_protection = false

  depends_on = [google_project_service.enabled_apis]
}

resource "google_sql_database" "aether_db" {
  name     = var.db_name
  instance = google_sql_database_instance.postgres_ledger.name
}

resource "google_sql_user" "aether_db_user" {
  name     = "aether_admin"
  instance = google_sql_database_instance.postgres_ledger.name
  password = random_password.db_password.result
}

# ------------------------------------------------------------------------------
# 6. Cloud Run Microservice (Autoscaling 0 → 1000, <50ms Cold-Start)
# ------------------------------------------------------------------------------
resource "google_service_account" "cloud_run_sa" {
  account_id   = "brics-aether-cloudrun-sa"
  display_name = "BRICS AETHER Cloud Run Execution Service Account"
}

resource "google_cloud_run_v2_service" "api_service" {
  name     = "brics-aether-api"
  location = var.primary_region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run_sa.email

    scaling {
      min_instance_count = var.cloud_run_min_instances
      max_instance_count = var.cloud_run_max_instances
    }

    containers {
      image = "gcr.io/${var.project_id}/aether-api:latest"

      resources {
        limits = {
          cpu    = "4"
          memory = "8Gi"
        }
        cpu_idle = true
        startup_cpu_boost = true # Enables <50ms fast startup
      }

      env {
        name  = "PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "POSTGRES_HOST"
        value = google_sql_database_instance.postgres_ledger.public_ip_address
      }
      env {
        name  = "POSTGRES_DB"
        value = var.db_name
      }
      env {
        name  = "POSTGRES_USER"
        value = google_sql_user.aether_db_user.name
      }
      env {
        name  = "POSTGRES_PASSWORD"
        value = random_password.db_password.result
      }
    }
  }

  depends_on = [
    google_project_service.enabled_apis,
    google_sql_database_instance.postgres_ledger
  ]
}

# Allow public unauthenticated invocations for citizen web API
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  name     = google_cloud_run_v2_service.api_service.name
  location = google_cloud_run_v2_service.api_service.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ------------------------------------------------------------------------------
# 7. Cloud Tasks Dispute Countdown Queue (24h, 48h, 72h SLA Clocks)
# ------------------------------------------------------------------------------
resource "google_cloud_tasks_queue" "dispute_clock_queue" {
  name     = "aether-dispute-clock"
  location = var.primary_region

  rate_limits {
    max_concurrent_dispatches = 1000
    max_dispatches_per_second = 500
  }

  retry_config {
    max_attempts       = 10
    max_retry_duration = "86400s"
    min_backoff        = "5s"
    max_backoff        = "3600s"
  }

  depends_on = [google_project_service.enabled_apis]
}

# ------------------------------------------------------------------------------
# 8. Secret Manager (API Keys & Cryptographic Credential Anchors)
# ------------------------------------------------------------------------------
resource "google_secret_manager_secret" "owm_api_key_secret" {
  secret_id = "aether-owm-api-key"
  replication {
    auto {}
  }
  depends_on = [google_project_service.enabled_apis]
}

resource "google_secret_manager_secret_version" "owm_api_key_version" {
  secret      = google_secret_manager_secret.owm_api_key_secret.id
  secret_data = "3f04af8f0d7e79fc646d1f325cc077ac"
}

resource "google_secret_manager_secret" "gemini_api_key_secret" {
  secret_id = "aether-gemini-api-key"
  replication {
    auto {}
  }
  depends_on = [google_project_service.enabled_apis]
}
