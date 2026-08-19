

## One-Command Pilot (when TODO above is done)
```bash
gcloud run deploy brics-aether --source . --region asia-south1 --allow-unauthenticated
# + terraform apply -var-file=prod.tfvars  (11 countries)
# + bq mk --dataset brics-aether.raw && bq load ... raci.csv
