# ==============================================================================
# BRICS-AETHER: Production / Pilot Environment Variables
# File: terraform/prod.tfvars
# ==============================================================================

project_id      = "brics-506015"
primary_region  = "asia-south1"
environment     = "pilot"

cloud_run_min_instances = 0
cloud_run_max_instances = 1000
cloud_run_concurrency   = 80

db_instance_tier = "db-custom-4-16384"
db_name          = "aether_dispute_ledger"
