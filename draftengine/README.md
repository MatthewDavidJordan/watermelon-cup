# Watermelon Cup Draft Engine

## Local Development

Before running the draftengine application locally, make sure to set the Firebase credentials path:

```bash
# Windows PowerShell
$env:FIREBASE_CREDENTIALS_PATH = "C:\Users\mdj20\Downloads\watermelon-cup-production-firebase-adminsdk-2rmym-f1467bd3a9.json"

# Verify the path is set
echo $env:FIREBASE_CREDENTIALS_PATH
```

## Docker Deployment

The application can be deployed using Docker to any machine.

### Setup Instructions

1. **Copy necessary files to the target machine:**
   - Dockerfile
   - docker-compose.yml
   - .env file (after updating with your values)
   - Firebase credentials JSON file

2. **Create a credentials directory:**
   ```bash
   mkdir -p credentials
   ```

3. **Copy your Firebase credentials to the credentials directory:**
   ```bash
   # On Windows
   copy "path\to\firebase-credentials.json" credentials\firebase-credentials.json
   
   # On Linux/Mac
   cp path/to/firebase-credentials.json credentials/firebase-credentials.json
   ```

4. **Configure your .env file:**
   - Update `SHEETS_SPREADSHEET_ID` with your actual Google Sheets ID
     - This is the string between `/d/` and `/edit` in your Google Sheets URL
     - Example: `https://docs.google.com/spreadsheets/d/`**`1A2B3C4D5E6F7G8H9I0JKL`**`/edit`
   - The other values can remain as they are in the template

5. **Build and run the Docker container:**
   ```bash
   # Build the image
   docker build -t watermelon-cup/draftengine .
   
   # Run with docker-compose
   docker-compose up -d
   ```
   
6. **Push to Docker Hub (optional):**
   ```bash
   # Login to Docker Hub
   docker login
   
   # Tag your image
   docker tag watermelon-cup/draftengine yourusername/watermelon-cup-draftengine:latest
   
   # Push to Docker Hub
   docker push yourusername/watermelon-cup-draftengine:latest
   ```

### Environment Variables

The following environment variables can be configured in your .env file:

- `SHEETS_SPREADSHEET_ID`: ID of your Google Sheets document
- `FIREBASE_CREDENTIALS_PATH`: Path to Firebase credentials inside the container
- `CREDENTIALS_DIR`: Directory on host machine containing credentials
- `SPRING_PROFILES_ACTIVE`: Spring profile to use (e.g., prod)

### Firebase Authentication

This application uses a Firebase service account for Google Sheets API authentication. This server-side approach is more secure than OAuth client credentials as it doesn't require user interaction.

Make sure your Firebase service account JSON file has the necessary permissions for Google Sheets API access.

### Accessing the Application

Once running, the application will be available at:
- http://localhost:8080
