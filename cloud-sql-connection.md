# Cloud SQL Proxy Setup (Alternative Solution)

## Option 2: Use Cloud SQL Proxy (More Secure)

Instead of opening firewall rules, you can use Cloud SQL Proxy which provides secure connections:

### 1. Install Cloud SQL Proxy
```bash
# Download the proxy
curl -o cloud-sql-proxy https://dl.google.com/cloudsql/cloud-sql-proxy.linux.amd64

# Make it executable
chmod +x cloud-sql-proxy
```

### 2. Get your instance connection name
```bash
gcloud sql instances describe vidvaan-attempt-2-instance --format="value(connectionName)"
```

### 3. Update your apphosting.yaml
Add the connection name to your environment variables:
```yaml
runtime: nodejs20
env_variables:
  FIREBASE_PROJECT_ID: "vidvaan-attempt-2"
  FIREBASE_CLIENT_EMAIL: "firebase-adminsdk-fbsvc@vidvaan-attempt-2.iam.gserviceaccount.com"
  FIREBASE_PRIVATE_KEY: "your-private-key"
  DB_HOST: "/cloudsql/vidvaan-attempt-2:us-central1:vidvaan-attempt-2-instance"
  DB_PORT: "5432"
  DB_NAME: "postgres"
  DB_USER: "postgres"
  DB_PASSWORD: "Shivtest@135"
```

### 4. Update your database connection code
In your API route, you'll need to use Unix socket connection instead of TCP.

## Recommended: Use Option 1 (Firewall Rules)
For now, use Option 1 (adding IP ranges) as it's simpler and will work immediately. 