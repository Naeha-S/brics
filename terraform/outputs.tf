# ==============================================================================
# BRICS-AETHER: Terraform Outputs
# File: terraform/outputs.tf
# ==============================================================================

output "cloud_run_url" {
  description = "Public URL of the BRICS-AETHER Cloud Run API microservice"
  value       = google_cloud_run_v2_service.api_service.uri
}

output "sovereign_bucket_names" {
  description = "Map of all 11 BRICS+ sovereign data boundary buckets"
  value       = { for k, b in google_storage_bucket.sovereign_buckets : k => b.name }
}

output "pubsub_telemetry_topic" {
  description = "Pub/Sub topic ID for high-throughput streaming telemetry"
  value       = google_pubsub_topic.telemetry_stream_topic.id
}

output "postgres_ledger_connection" {
  description = "Cloud SQL PostgreSQL instance connection name for the SHA-256 dispute ledger"
  value       = google_sql_database_instance.postgres_ledger.connection_name
}

output "bigquery_mart_dataset" {
  description = "BigQuery dataset ID for analytical marts and spatial intersections"
  value       = google_bigquery_dataset.bq_mart.dataset_id
}

output "confidential_pool_name" {
  description = "Google Cloud Workload Identity Pool for AMD SEV-SNP Confidential Space attestation"
  value       = google_iam_workload_identity_pool.confidential_pool.name
}
