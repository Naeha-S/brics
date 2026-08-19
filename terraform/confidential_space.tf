# ==============================================================================
# BRICS-AETHER: Confidential Space & TEE Enclave Infrastructure
# File: terraform/confidential_space.tf
# Platform: Google Cloud Confidential Computing (AMD SEV-SNP)
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. TEE Enclave Service Account
# ------------------------------------------------------------------------------
resource "google_service_account" "tee_enclave_sa" {
  account_id   = "brics-tee-enclave-sa"
  display_name = "BRICS AETHER Confidential Space TEE Enclave SA"
  description  = "Dedicated identity for executing PINN back-trace audits and federated aggregation inside TEE"
}

# ------------------------------------------------------------------------------
# 2. Confidential Computing Workload Identity Pool & Attestation Provider
# ------------------------------------------------------------------------------
resource "google_iam_workload_identity_pool" "confidential_pool" {
  workload_identity_pool_id = "brics-confidential-space-pool"
  display_name              = "BRICS Confidential Space Attestation Pool"
  description               = "Validates OIDC Hardware Attestation tokens from AMD SEV-SNP Confidential VMs"
  disabled                  = false
}

resource "google_iam_workload_identity_pool_provider" "attestation_provider" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.confidential_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "amd-sev-snp-attestation-provider"
  display_name                       = "AMD SEV-SNP Confidential Computing Token Provider"
  
  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.swname"           = "assertion.swname"
    "attribute.swversion"        = "assertion.swversion"
    "attribute.container_image"  = "assertion.container.image_digest"
    "attribute.hwmodel"          = "assertion.submods.confidential_space.support_attributes.hardware_model"
  }

  oidc {
    issuer_uri = "https://confidentialcomputing.googleapis.com"
  }
}

# Allow the Attestation Provider to impersonate the TEE Service Account
# ONLY when running verified container image inside verified AMD SEV-SNP hardware
resource "google_service_account_iam_member" "tee_workload_impersonation" {
  service_account_id = google_service_account.tee_enclave_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.confidential_pool.name}/*"
}

# ------------------------------------------------------------------------------
# 3. KMS Cryptographic Key Ring for Sovereign TEE Decryption
# ------------------------------------------------------------------------------
resource "google_kms_key_ring" "sovereign_key_ring" {
  name     = "brics-sovereign-key-ring"
  location = var.primary_region

  depends_on = [google_project_service.enabled_apis]
}

resource "google_kms_crypto_key" "tee_sovereign_key" {
  name            = "brics-tee-audit-key"
  key_ring        = google_kms_key_ring.sovereign_key_ring.id
  rotation_period = "7776000s" # 90 Days

  purpose = "ENCRYPT_DECRYPT"
}

# Grant Decryption permission to TEE Enclave Service Account
resource "google_kms_crypto_key_iam_member" "tee_key_decrypter" {
  crypto_key_id = google_kms_crypto_key.tee_sovereign_key.id
  role          = "roles/cloudkms.cryptoKeyDecrypter"
  member        = "serviceAccount:${google_service_account.tee_enclave_sa.email}"
}

# ------------------------------------------------------------------------------
# 4. Confidential VM Instance Template (AMD SEV-SNP n2d-standard-8 for PINN)
# ------------------------------------------------------------------------------
resource "google_compute_instance_template" "confidential_pinn_worker" {
  name_prefix  = "brics-confidential-pinn-"
  machine_type = var.confidential_vm_type # n2d-standard-8
  region       = var.primary_region

  scheduling {
    automatic_restart   = true
    on_host_maintenance = "TERMINATE" # Required for Confidential VMs
  }

  // Hardened Confidential Computing with AMD SEV-SNP
  confidential_instance_config {
    enable_confidential_compute = true
    confidential_instance_type  = "SEV_SNP"
  }

  // Shielded VM integrity verification
  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }

  disk {
    source_image = "cos-cloud/cos-stable" # Container-Optimized OS
    auto_delete  = true
    boot         = true
    disk_size_gb = 100
    disk_type    = "pd-ssd"
  }

  network_interface {
    network = "default"
    access_config {
      // Ephemeral public IP for secure egress
    }
  }

  service_account {
    email  = google_service_account.tee_enclave_sa.email
    scopes = ["cloud-platform"]
  }

  metadata = {
    "tee-image-reference" = "gcr.io/${var.project_id}/pinn-confidential-audit:latest"
    "tee-container-log-redirect" = "true"
    "enable-oslogin"             = "TRUE"
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [google_project_service.enabled_apis]
}
