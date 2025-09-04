# 🚀 RLDA SaaS App - Complete Documentation

Revenue Leakage Detection & Analytics (RLDA) is a comprehensive SaaS-ready Streamlit application for contract, billing, and CRM risk analysis. Now enhanced with **Firestore integration** for cloud-based data storage, real-time collaboration, **OAuth integrations** with 6 major platforms, and **automated data synchronization**.

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Project Structure](#project-structure)
4. [Setup Instructions](#setup-instructions)
5. [Firestore Integration](#firestore-integration)
6. [OAuth Integrations](#oauth-integrations)
7. [Data Sync Scheduler](#data-sync-scheduler)
8. [Usage Guide](#usage-guide)
9. [Security & Privacy](#security--privacy)
10. [Troubleshooting](#troubleshooting)
11. [Deployment](#deployment)
12. [API Reference](#api-reference)

---

## 🎯 Project Overview

RLDA provides comprehensive revenue leakage detection through:
- **Contract Analysis**: Identify risks in contracts and agreements
- **Billing Analysis**: Detect billing discrepancies and revenue leaks
- **CRM Analysis**: Analyze customer relationships for revenue opportunities
- **Real-time Collaboration**: Team-based analysis with comments and sharing
- **Automated Data Sync**: Keep data fresh with scheduled synchronization
- **Multi-platform Integration**: Connect with 6 major business platforms

## ✨ Key Features

### 🔥 Core Analysis Features
- **User Authentication**: Secure Firebase Auth with email/password
- **Interactive Dashboard**: Analytics with exportable charts and filters
- **Multi-format Reports**: Export to HTML, PDF, and Markdown
- **Rule-based & AI-powered Analysis**: Choose your analysis method

### 🔥 Firestore Cloud Features
- **Cloud-based Data Storage**: No more local CSV files
- **Cross-session Persistence**: Analysis results saved to cloud
- **User Preferences**: Personalized experience across devices
- **Real-time Collaboration**: Team analysis sessions with comments
- **Data Migration Tools**: Easy transition from CSV to Firestore

### 🔗 OAuth Integration Features
- **HubSpot CRM**: Fetch deals and customer data
- **QuickBooks**: Pull invoices and billing data
- **Google Drive**: Access contract files and documents
- **Salesforce**: Fetch opportunities and contracts data
- **Stripe**: Pull invoices and subscriptions data
- **PandaDoc**: Access documents and templates
- **Secure OAuth 2.0**: Token-based authentication with automatic refresh

### 🕐 Data Sync Scheduler
- **Automatic Synchronization**: Configurable intervals (6-24 hours)
- **Platform-specific Settings**: Different sync frequencies per platform
- **Background Processing**: Non-blocking operation
- **Real-time Monitoring**: Sync status and history tracking
- **Manual Sync**: Immediate data fetching when needed

### 🤝 Collaboration Features
- **Session Management**: Create and join collaboration sessions
- **Real-time Comments**: Discuss findings with team members
- **Shared Analysis**: Results shared across all participants
- **Team Analytics**: Collaborative revenue leakage detection

### 🚨 Alerts & Reports Features
- **Intelligent Alerts**: Automated detection of revenue leakage risks
- **Real-time Monitoring**: Continuous monitoring of contracts, billing, and CRM data
- **Comprehensive Reports**: Generate detailed reports for different business aspects
- **Risk Assessment**: Client risk scoring and recommendations
- **Customizable Thresholds**: Configurable alert sensitivity and preferences

---

## 📁 Project Structure

```
rlda/
├── app.py                    # Main Streamlit entry point
├── auth.py                   # User authentication (Firebase Auth)
├── dashboard.py              # Dashboard with analytics and charts
├── contract.py               # Contract analysis module
├── billing.py                # Billing analysis module
├── crm.py                    # CRM analysis module
├── integrations.py           # OAuth integrations (6 platforms)
├── scheduler.py              # Data sync scheduler
├── feedback.py               # Feedback management (Firestore-based)
├── firestore_service.py      # Firestore database operations
├── firebase_config.py        # Firebase configuration management
├── utils.py                  # Parsing, analysis, and helper functions
├── requirements.txt          # Python dependencies
├── .streamlit/
│   ├── config.toml          # Streamlit app configuration
│   └── secrets.toml         # OAuth credentials and Firebase config
├── assets/
│   └── logo.png             # Application branding
├── feedback/                 # Legacy CSV feedback (migratable)
│   └── feedback_user1.csv
├── user_data/               # User-specific data storage
│   └── anonymous/
└── test_*.py                # Integration test scripts
```

---

## 🚀 Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Firebase Setup (Required)

#### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing project
3. Enable **Authentication** with Email/Password sign-in method
4. Enable **Firestore Database** in test mode or production mode
5. Go to **Project Settings** > **Service Accounts**
6. Click **Generate New Private Key** to download the service account JSON

#### Step 2: Configure Service Account

**Option A: Environment Variables (Production)**
```bash
export FIREBASE_PROJECT_ID="your-project-id"
export FIREBASE_PRIVATE_KEY_ID="your-private-key-id"
export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
export FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
export FIREBASE_CLIENT_ID="your-client-id"
export FIREBASE_CLIENT_X509_CERT_URL="https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com"
```

**Option B: Streamlit Secrets (Development)**
Create `.streamlit/secrets.toml`:
```toml
[firebase]
apiKey = "your-api-key"
authDomain = "your-project.firebaseapp.com"
projectId = "your-project-id"
storageBucket = "your-project.appspot.com"
messagingSenderId = "your-sender-id"
appId = "your-app-id"
databaseURL = ""

[firebase_service_account]
type = "service_account"
project_id = "your-project-id"
private_key_id = "your-private-key-id"
private_key = "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
client_email = "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
client_id = "your-client-id"
auth_uri = "https://accounts.google.com/o/oauth2/auth"
token_uri = "https://oauth2.googleapis.com/token"
auth_provider_x509_cert_url = "https://www.googleapis.com/oauth2/v1/certs"
client_x509_cert_url = "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com"
```

#### Step 3: Configure Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Feedback - users can read/write their own feedback
    match /feedback/{feedbackId} {
      allow read, write: if request.auth != null && 
        resource.data.user_id == request.auth.uid;
    }
    
    // Analysis results - users can read/write their own results
    match /analysis_results/{resultId} {
      allow read, write: if request.auth != null && 
        resource.data.user_id == request.auth.uid;
    }
    
    // User preferences - users can read/write their own preferences
    match /user_preferences/{userId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == userId;
    }
    
    // Collaboration sessions - users can read/write sessions they're part of
    match /collaboration_sessions/{sessionId} {
      allow read, write: if request.auth != null && 
        (resource.data.created_by == request.auth.uid || 
         request.auth.uid in resource.data.participants);
    }
    
    // Integration tokens - users can read/write their own tokens
    match /integration_tokens/{tokenId} {
      allow read, write: if request.auth != null && 
        resource.data.user_id == request.auth.uid;
    }
    
    // Sync logs - users can read/write their own sync logs
    match /sync_logs/{logId} {
      allow read, write: if request.auth != null && 
        resource.data.user_id == request.auth.uid;
    }
  }
}
```

### 3. OAuth Integrations Setup (Optional but Recommended)

#### HubSpot OAuth Setup
1. Go to [HubSpot Developer Portal](https://developers.hubspot.com/)
2. Create app with name "RLDA Integration"
3. Add redirect URL: `http://localhost:8502/integrations/hubspot/callback`
4. Select scopes: `contacts`, `deals`
5. Copy Client ID and Client Secret

#### QuickBooks OAuth Setup
1. Go to [Intuit Developer Portal](https://developer.intuit.com/)
2. Create QuickBooks Online API app
3. Add redirect URL: `http://localhost:8502/integrations/quickbooks/callback`
4. Select scope: `com.intuit.quickbooks.accounting`
5. Copy Client ID and Client Secret

#### Google Drive OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google Drive API
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials
5. Add redirect URL: `http://localhost:8502/integrations/google/callback`
6. Copy Client ID and Client Secret

#### Salesforce OAuth Setup
1. Go to [Salesforce Setup](https://login.salesforce.com/)
2. Create Connected App named "RLDA Integration"
3. Enable OAuth Settings
4. Add redirect URL: `http://localhost:8502/integrations/salesforce/callback`
5. Select scopes: `api`, `refresh_token`, `offline_access`
6. Copy Consumer Key and Consumer Secret

#### Stripe OAuth Setup
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Create Connect application
3. Add redirect URI: `http://localhost:8502/integrations/stripe/callback`
4. Select scope: `read_write`
5. Copy Client ID and Client Secret

#### PandaDoc OAuth Setup
1. Go to [PandaDoc Developer Portal](https://developers.pandadoc.com/)
2. Create app named "RLDA Integration"
3. Add redirect URI: `http://localhost:8502/integrations/pandadoc/callback`
4. Select scopes: `read`, `write`
5. Copy Client ID and Client Secret

#### Update OAuth Credentials
Add to `.streamlit/secrets.toml`:
```toml
[hubspot]
client_id = "your_actual_hubspot_client_id"
client_secret = "your_actual_hubspot_client_secret"

[quickbooks]
client_id = "your_actual_quickbooks_client_id"
client_secret = "your_actual_quickbooks_client_secret"

[google_drive]
client_id = "your_actual_google_client_id"
client_secret = "your_actual_google_client_secret"

[salesforce]
client_id = "your_actual_salesforce_consumer_key"
client_secret = "your_actual_salesforce_consumer_secret"

[stripe]
client_id = "your_actual_stripe_client_id"
client_secret = "your_actual_stripe_client_secret"

[pandadoc]
client_id = "your_actual_pandadoc_client_id"
client_secret = "your_actual_pandadoc_client_secret"
```

### 4. Run the Application

```bash
streamlit run app.py
```

---

## 🔥 Firestore Integration

### Features Implemented

#### Authentication
- **Firebase Auth** integration with email/password
- **Session management** with Streamlit session state
- **Secure logout** functionality

#### Data Persistence
- **Analysis Results**: Contract, Billing, CRM analysis results stored in Firestore
- **User Preferences**: Settings and preferences synced to cloud
- **Feedback Storage**: User feedback stored with metadata
- **Integration Tokens**: OAuth tokens encrypted and stored securely

#### Collaboration Features
- **Session Creation**: Create collaboration sessions for team analysis
- **Real-time Comments**: Add comments to analysis sessions
- **Session Management**: Join, leave, and manage collaboration sessions

#### Cloud Sync
- **Manual Sync**: "Save to Cloud" button in sidebar
- **Auto-load**: Previous analysis results loaded on login
- **Data Migration**: Migrate existing CSV data to Firestore

### Firestore Collections

#### users
```json
{
  "user_id": "string",
  "email": "string",
  "full_name": "string",
  "company_name": "string",
  "phone_number": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### feedback
```json
{
  "user_id": "string",
  "section": "string",
  "mode": "string",
  "issue": "string",
  "severity": "string",
  "feedback": "string",
  "timestamp": "timestamp"
}
```

#### analysis_results
```json
{
  "user_id": "string",
  "analysis_type": "string",
  "results": "array",
  "metadata": "object",
  "created_at": "timestamp"
}
```

#### user_preferences
```json
{
  "user_id": "string",
  "contract_mode": "string",
  "billing_mode": "string",
  "crm_mode": "string",
  "auto_save": "boolean",
  "show_timestamps": "boolean",
  "theme": "string",
  "sync_enabled": "boolean",
  "sync_interval": "number"
}
```

#### collaboration_sessions
```json
{
  "session_id": "string",
  "session_name": "string",
  "session_type": "string",
  "created_by": "string",
  "participants": "array",
  "data": "object",
  "status": "string",
  "created_at": "timestamp"
}
```

#### integration_tokens
```json
{
  "user_id": "string",
  "platform": "string",
  "access_token": "string",
  "refresh_token": "string",
  "expires_in": "number",
  "token_type": "string",
  "expires_at": "timestamp",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### sync_logs
```json
{
  "user_id": "string",
  "platform": "string",
  "sync_name": "string",
  "start_time": "ISO timestamp",
  "end_time": "ISO timestamp",
  "duration_seconds": "number",
  "success": "boolean",
  "records_count": "number",
  "error": "string (optional)",
  "created_at": "timestamp"
}
```

#### synced_data
```json
{
  "user_id": "string",
  "platform": "string",
  "data": "array of records",
  "sync_timestamp": "ISO timestamp",
  "record_count": "number",
  "created_at": "timestamp"
}
```

#### sync_summaries
```json
{
  "user_id": "string",
  "date": "YYYY-MM-DD",
  "total_syncs": "number",
  "successful_syncs": "number",
  "failed_syncs": "number",
  "total_records": "number",
  "platforms_synced": "array of strings",
  "created_at": "timestamp"
}
```

#### alerts
```json
{
  "user_id": "string",
  "type": "string",
  "severity": "string",
  "title": "string",
  "description": "string",
  "client": "string",
  "recommendation": "string",
  "created_at": "timestamp",
  "resolved": "boolean",
  "resolved_at": "timestamp (optional)"
}
```

#### reports
```json
{
  "user_id": "string",
  "title": "string",
  "type": "string",
  "summary": "string",
  "data": "array",
  "period": "string",
  "generated_at": "timestamp",
  "created_at": "timestamp"
}
```

---

## 🔗 OAuth Integrations

### Supported Platforms

| Platform | Data Types | Default Sync Interval | Use Case |
|----------|------------|----------------------|----------|
| **HubSpot** | Deals, Contacts | 6 hours | CRM Analysis |
| **QuickBooks** | Invoices, Billing | 6 hours | Billing Analysis |
| **Google Drive** | Contract Files | 12 hours | Contract Analysis |
| **Salesforce** | Opportunities, Contracts | 6 hours | CRM/Contract Analysis |
| **Stripe** | Invoices, Subscriptions | 6 hours | Billing Analysis |
| **PandaDoc** | Documents, Templates | 12 hours | Contract Analysis |

### Integration Workflows

#### HubSpot → CRM Analysis
1. Connect HubSpot in Integrations tab
2. Click "🔍 Analyze Deals" to fetch deal data
3. Navigate to CRM tab to analyze the imported data
4. Generate reports with HubSpot insights

#### QuickBooks → Billing Analysis
1. Connect QuickBooks in Integrations tab
2. Click "🔍 Analyze Invoices" to fetch billing data
3. Navigate to Billing tab to analyze the imported data
4. Generate reports with QuickBooks insights

#### Google Drive → Contract Analysis
1. Connect Google Drive in Integrations tab
2. Click "🔍 Analyze Contracts" to fetch contract files
3. Navigate to Contract tab to analyze the imported data
4. Generate reports with contract insights

#### Salesforce → CRM/Contract Analysis
1. Connect Salesforce in Integrations tab
2. Click "🔍 Analyze Opportunities" or "🔍 Analyze Contracts"
3. Navigate to CRM or Contract tab to analyze the imported data
4. Generate reports with Salesforce insights

#### Stripe → Billing Analysis
1. Connect Stripe in Integrations tab
2. Click "🔍 Analyze Invoices" or "🔍 Analyze Subscriptions"
3. Navigate to Billing tab to analyze the imported data
4. Generate reports with Stripe insights

#### PandaDoc → Contract Analysis
1. Connect PandaDoc in Integrations tab
2. Click "🔍 Analyze Documents" or "🔍 Analyze Templates"
3. Navigate to Contract tab to analyze the imported data
4. Generate reports with PandaDoc insights

### Data Fields by Platform

#### HubSpot Data Fields
- Deal ID, Deal Name, Amount, Stage, Close Date, Create Date, Is Closed, Is Won

#### QuickBooks Data Fields
- Invoice ID, Customer, Amount, Balance, Due Date, Create Date, Status

#### Google Drive Data Fields
- File ID, File Name, Type, Size, Created, Modified, Link

#### Salesforce Data Fields
**Opportunities**: Opportunity ID, Name, Amount, Stage, Close Date, Created Date, Probability, Type, Lead Source, Description
**Contracts**: Contract ID, Contract Number, Account ID, Status, Start Date, End Date, Contract Term, Billing Address fields, Description

#### Stripe Data Fields
**Invoices**: Invoice ID, Customer ID, Customer Email, Amount, Currency, Status, Due Date, Created, Description, Collection Method
**Subscriptions**: Subscription ID, Customer ID, Customer Email, Status, Current Period Start/End, Amount, Currency, Created, Cancel At Period End

#### PandaDoc Data Fields
**Documents**: Document ID, Name, Status, Type, Created, Modified, Completed, Expires, Tags, Recipients, Content
**Templates**: Template ID, Name, Type, Created, Modified, Tags, Content, Version

---

## 🚨 Alerts & Reports

### Features

#### Intelligent Alert System
- **Contract No Invoice**: Detects when contracts are signed but no invoice is generated
- **Expired Contracts Active Pipeline**: Identifies expired contracts with active CRM pipeline
- **Delayed Contract Signing**: Alerts when contracts take longer than threshold to sign
- **Missing Payments**: Tracks overdue invoices without payment
- **Revenue Leakage**: Compares contract values vs actual billing
- **Opportunity Aging**: Monitors opportunities aging without progress
- **Contract Renewal**: Reminds about contracts approaching renewal
- **Billing Discrepancy**: Detects discrepancies between billing systems

#### Report Generation
- **Revenue Leakage Summary**: Comprehensive analysis of potential revenue loss
- **Contract Performance**: Contract signing efficiency and performance metrics
- **Billing Analysis**: Billing efficiency and payment collection analysis
- **CRM Pipeline Health**: Opportunity management and pipeline performance
- **Client Risk Assessment**: Risk scoring and recommendations for clients
- **Custom Reports**: User-defined report generation

#### Alert Management
- **Severity Levels**: High, Medium, Low priority alerts
- **Real-time Monitoring**: Continuous monitoring of integrated data
- **Resolution Tracking**: Mark alerts as resolved with timestamps
- **History Management**: Complete audit trail of all alerts
- **Customizable Thresholds**: Configurable alert sensitivity

### Alert Types

| Alert Type | Description | Severity | Example |
|------------|-------------|----------|---------|
| **Contract No Invoice** | Contract signed but no invoice found | High | Client A: Signed contract 2 weeks ago, but no invoice found |
| **Expired Contracts Active Pipeline** | Contracts expired but CRM shows active pipeline | Medium | Client B: 3 contracts expired, but CRM shows active pipeline |
| **Delayed Contract Signing** | Contract signing delayed beyond threshold | Medium | Client C: Took 18 days to sign — delay risk |
| **Missing Payments** | Invoices overdue without payment | High | Invoice #12345: 30 days overdue |
| **Revenue Leakage** | Potential revenue leakage detected | High | Contract value: $50,000, Billed: $35,000 |
| **Opportunity Aging** | Opportunities aging without progress | Medium | Deal "Enterprise Contract": 45 days old |
| **Contract Renewal** | Contract renewal approaching | Medium | Contract #789: Expires in 15 days |
| **Billing Discrepancy** | Billing discrepancy between systems | High | QuickBooks: $10,000, Stripe: $9,500 |

### Usage

#### Accessing Alerts & Reports
1. Navigate to the **"Settings"** tab → **"Alerts & Reports"** sub-tab
2. View active alerts with severity indicators
3. Generate comprehensive reports
4. Configure alert settings and thresholds

#### Alert Workflow
1. **Detection**: System automatically detects issues from integrated data
2. **Notification**: Alerts appear in real-time with severity levels
3. **Action**: Review alert details and recommendations
4. **Resolution**: Mark alerts as resolved when addressed
5. **Tracking**: Monitor alert history and trends

#### Report Generation
1. Select report type from dropdown
2. Choose date range for analysis
3. Generate report with detailed insights
4. Download in CSV or JSON format
5. Save to report library for future reference

---

## 🕐 Data Sync Scheduler

### Features

#### Automatic Data Synchronization
- **Configurable intervals**: 6, 8, 12, or 24 hours per platform
- **Platform-specific settings**: Different sync intervals for different integrations
- **Background processing**: Runs in background threads without blocking the UI
- **Token refresh**: Automatically refreshes OAuth tokens before sync

#### Sync Monitoring
- **Real-time status**: View scheduler status and next sync times
- **Sync history**: Track all sync attempts with success/failure rates
- **Performance metrics**: Monitor sync duration and record counts
- **Error logging**: Detailed error tracking for troubleshooting

#### User Control
- **Enable/disable sync**: Turn automatic sync on/off per user
- **Manual sync**: Trigger immediate sync for any platform
- **Custom intervals**: Set different sync frequencies per platform
- **Sync preferences**: Store user-specific sync settings

### Architecture

```
DataSyncScheduler
├── Background Thread
│   ├── Schedule Management
│   ├── Job Execution
│   └── Error Handling
├── Platform Configs
│   ├── HubSpot (6h default)
│   ├── QuickBooks (6h default)
│   ├── Google Drive (12h default)
│   └── Salesforce (6h default)
└── Firestore Integration
    ├── Sync Logs
    ├── Synced Data
    ├── User Preferences
    └── Daily Summaries
```

### Data Flow

1. **Scheduler Initialization**
   - Start background thread
   - Load user preferences
   - Schedule jobs for connected integrations

2. **Sync Execution**
   - Refresh OAuth tokens
   - Fetch data from platform APIs
   - Store data in Firestore
   - Log sync results

3. **Monitoring & Reporting**
   - Track sync performance
   - Generate daily summaries
   - Provide real-time status

### Default Intervals

| Platform | Default Interval | Reason |
|----------|-----------------|---------|
| **HubSpot** | 6 hours | Deals change frequently |
| **QuickBooks** | 6 hours | Invoices updated regularly |
| **Google Drive** | 12 hours | Contract files change less often |
| **Salesforce** | 6 hours | Opportunities updated frequently |

### Usage

#### Accessing the Scheduler
1. Navigate to the **"Settings"** tab → **"Data Sync Scheduler"** sub-tab
2. Configure your sync preferences
3. Monitor sync status and history

#### Configuration Options
- **Global Settings**: Enable/disable sync, set default interval
- **Platform-specific Settings**: Custom intervals per platform
- **Manual Sync**: Immediate data fetching buttons
- **Monitoring**: Real-time status and sync history

---

## 📖 Usage Guide

### Application Tabs

#### Dashboard Tab
- Interactive analytics and charts
- Exportable visualizations
- Real-time data insights
- Performance metrics

#### Contract Tab
- Upload contract files
- Rule-based and AI-powered analysis
- Risk identification and scoring
- Export analysis reports

#### Billing Tab
- Upload billing data
- Invoice discrepancy detection
- Revenue leakage analysis
- Financial reporting

#### CRM Tab
- Customer relationship analysis
- Opportunity tracking
- Revenue forecasting
- Customer insights

#### Integrations Tab
- Connect to 6 major platforms
- OAuth authentication
- Data fetching and preview
- Integration management

#### Files & Reports Tab
- Uploaded file management
- Generated report downloads
- File organization
- Report archiving

#### Feedback Tab
- Submit feedback
- View feedback history
- Issue tracking
- Improvement suggestions

#### Settings Tab
- **General Settings**: User preferences, analysis modes, display options, data migration
- **Data Sync Scheduler**: Configure automatic sync, monitor status, view history, manual sync
- **Collaboration**: Create/join sessions, real-time comments, shared analysis
- **Alerts & Reports**: Active alerts, report generation, alert history, alert settings

### Key Workflows

#### New User Onboarding
1. Create account with email/password
2. Complete user profile (name, company, phone)
3. Connect relevant integrations
4. Configure sync preferences
5. Start first analysis

#### Team Collaboration
1. Create collaboration session in Settings → Collaboration tab
2. Invite team members
3. Share analysis results
4. Add comments and discussions
5. Export collaborative reports

#### Data Integration Workflow
1. Connect platform in Integrations tab
2. Authorize OAuth access
3. Fetch relevant data
4. Analyze imported data
5. Generate insights and reports

#### Automated Sync Workflow
1. Enable sync in Settings → Data Sync Scheduler tab
2. Configure sync intervals
3. Monitor sync status
4. Review sync history
5. Adjust settings as needed

---

## 🔒 Security & Privacy

### OAuth Security
- All OAuth tokens are encrypted and stored securely in Firestore
- Tokens are user-specific and isolated
- Automatic token refresh prevents expiration issues
- Secure token deletion on disconnect

### Data Privacy
- All imported data is user-specific and private
- No data sharing between users
- Integration tokens are encrypted
- Automatic cleanup of expired tokens

### API Rate Limits
- Respects platform-specific rate limits
- Implements exponential backoff for failed requests
- Caches data when appropriate
- Monitors API usage

### Firestore Security
- User-based access control
- Encrypted data storage
- Secure authentication
- Audit trail for all operations

### Best Practices
- Regular token rotation
- Monitor API usage
- Error alerts for failures
- Backup strategies
- Regular security updates

---

## 🛠 Troubleshooting

### Common Issues

#### Authentication Issues
1. **"Service account not configured"**
   - Ensure service account JSON is properly configured in secrets
   - Check environment variables if using that method

2. **"Permission denied" errors**
   - Verify Firestore security rules
   - Check if user is authenticated
   - Ensure service account has proper permissions

#### Integration Issues
1. **OAuth Redirect Errors**
   - Verify redirect URI matches exactly in OAuth app settings
   - Check for trailing slashes or protocol mismatches
   - Ensure localhost:8502 is correct for development

2. **Token Exchange Failures**
   - Verify client ID and secret are correct
   - Check that OAuth app is properly configured
   - Ensure scopes are correctly set

3. **API Permission Errors**
   - Verify OAuth scopes include required permissions
   - Check that user has granted necessary permissions
   - Ensure app is approved in OAuth consent screen

#### Scheduler Issues
1. **Sync Not Running**
   - Check if scheduler is enabled in user preferences
   - Verify OAuth tokens are valid
   - Check sync logs for error messages
   - Ensure platform integrations are connected

2. **Sync Failures**
   - Check OAuth token refresh
   - Reduce sync frequency if hitting rate limits
   - Check internet connectivity
   - Verify API endpoints

### Debug Mode

Enable debug logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Platform-Specific Issues

#### Salesforce Issues
- **"Invalid login"**: Ensure you're using the correct login URL
- **"Insufficient access rights"**: Verify the connected app has correct permissions

#### Stripe Issues
- **"Invalid client"**: Ensure you're using the correct client ID from your Connect app
- **"Invalid scope"**: Verify the scope includes `read_write` for full access

#### PandaDoc Issues
- **"Invalid workspace"**: Ensure the workspace ID is correctly configured
- **"API rate limit exceeded"**: Implement rate limiting for API calls

### Getting Help
- Check platform-specific developer documentation
- Review Firestore security rules
- Verify Firebase configuration
- Test with minimal data sets
- Check application logs

---

## 🚀 Deployment

### Streamlit Cloud Deployment

When deploying to Streamlit Cloud:

1. **Update Redirect URIs** to use your production domain:
   - HubSpot: `https://your-app-name.streamlit.app/integrations/hubspot/callback`
   - QuickBooks: `https://your-app-name.streamlit.app/integrations/quickbooks/callback`
   - Google Drive: `https://your-app-name.streamlit.app/integrations/google/callback`
   - Salesforce: `https://your-app-name.streamlit.app/integrations/salesforce/callback`
   - Stripe: `https://your-app-name.streamlit.app/integrations/stripe/callback`
   - PandaDoc: `https://your-app-name.streamlit.app/integrations/pandadoc/callback`

2. **Configure Environment Variables**:
```bash
export FIREBASE_PROJECT_ID="your-project-id"
export FIREBASE_PRIVATE_KEY_ID="your-private-key-id"
export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
export FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
export FIREBASE_CLIENT_ID="your-client-id"
export FIREBASE_CLIENT_X509_CERT_URL="https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com"

export HUBSPOT_CLIENT_ID="your_client_id"
export HUBSPOT_CLIENT_SECRET="your_client_secret"
export QUICKBOOKS_CLIENT_ID="your_client_id"
export QUICKBOOKS_CLIENT_SECRET="your_client_secret"
export GOOGLE_DRIVE_CLIENT_ID="your_client_id"
export GOOGLE_DRIVE_CLIENT_SECRET="your_client_secret"
export SALESFORCE_CLIENT_ID="your_client_id"
export SALESFORCE_CLIENT_SECRET="your_client_secret"
export STRIPE_CLIENT_ID="your_client_id"
export STRIPE_CLIENT_SECRET="your_client_secret"
export PANDADOC_CLIENT_ID="your_client_id"
export PANDADOC_CLIENT_SECRET="your_client_secret"

export SCHEDULER_ENABLED="true"
export SCHEDULER_LOG_LEVEL="INFO"
export SCHEDULER_MAX_RETRIES="3"
export SCHEDULER_RETRY_DELAY="300"
```

3. **Ensure Firebase Project** is properly configured
4. **Test All Integrations** in production environment

### Production Checklist

- [ ] Firebase project configured with Firestore
- [ ] Service account credentials set up
- [ ] Firestore security rules configured
- [ ] OAuth applications created for all platforms
- [ ] Client IDs and secrets configured
- [ ] Redirect URIs updated for production
- [ ] Environment variables set
- [ ] All integrations tested
- [ ] Scheduler configured
- [ ] Monitoring and alerts set up
- [ ] Backup strategies implemented
- [ ] Documentation updated

### Scaling Considerations

- **Horizontal Scaling**: Multiple scheduler instances
- **Load Balancing**: Distribute sync jobs across instances
- **Database Optimization**: Index sync logs for performance
- **Caching**: Cache frequently accessed sync data
- **Rate Limiting**: Respect platform-specific API limits

---

## 📚 API Reference

### Core Functions

#### Authentication
- `login_user(email, password)`: Authenticate user with Firebase
- `signup_user(email, password, full_name, phone_number, company_name)`: Create new user account
- `logout_user()`: Sign out current user
- `is_logged_in()`: Check if user is authenticated

#### Firestore Operations
- `store_feedback(section, mode, issue, severity, feedback)`: Store user feedback
- `get_user_feedback(user_id)`: Retrieve user's feedback
- `store_analysis_results(analysis_type, results, metadata)`: Store analysis results
- `get_user_analysis_results(user_id, analysis_type)`: Retrieve analysis results
- `store_user_preferences(preferences)`: Store user preferences
- `get_user_preferences(user_id)`: Retrieve user preferences

#### Integration Management
- `store_integration_token(user_id, platform, token_info)`: Store OAuth token
- `get_integration_token(user_id, platform)`: Retrieve OAuth token
- `delete_integration_token(user_id, platform)`: Delete OAuth token
- `get_user_integrations(user_id)`: Get all user's integrations

#### Scheduler Functions
- `store_sync_log(user_id, sync_log)`: Store sync execution log
- `get_sync_logs(user_id, limit, start_date)`: Retrieve sync history
- `store_synced_data(user_id, platform, sync_data)`: Store synced data
- `get_latest_synced_data(user_id, platform)`: Get most recent sync data

#### Collaboration
- `create_collaboration_session(session_name, session_type, data)`: Create new session
- `join_collaboration_session(session_id)`: Join existing session
- `get_user_collaboration_sessions(user_id)`: Get user's sessions
- `add_collaboration_comment(session_id, comment, section)`: Add comment to session

### DataSyncScheduler Class

#### Methods
- `start_scheduler()`: Start the background scheduler
- `stop_scheduler()`: Stop the scheduler
- `schedule_user_syncs(user_id)`: Schedule syncs for a user
- `get_scheduler_status()`: Get current scheduler status

#### Configuration
- `sync_configs`: Platform-specific sync configurations
- `default_intervals`: Default sync intervals per platform

### Integration Functions

#### Data Fetching
- `fetch_hubspot_deals()`: Retrieve deals from HubSpot
- `fetch_quickbooks_invoices()`: Fetch invoices from QuickBooks
- `fetch_google_drive_contracts()`: Get contract files from Google Drive
- `fetch_salesforce_opportunities()`: Retrieve opportunities from Salesforce
- `fetch_salesforce_contracts()`: Fetch contracts from Salesforce
- `fetch_stripe_invoices()`: Get invoices from Stripe
- `fetch_stripe_subscriptions()`: Retrieve subscriptions from Stripe
- `fetch_pandadoc_documents()`: Fetch documents from PandaDoc
- `fetch_pandadoc_templates()`: Get templates from PandaDoc

#### OAuth Management
- `get_oauth_url(platform)`: Generate OAuth authorization URL
- `exchange_code_for_token(platform, code)`: Exchange authorization code for token
- `refresh_token_if_needed(platform)`: Refresh OAuth token if expired
- `is_integration_connected(platform)`: Check if platform is connected

---

## 📞 Support

### Platform-Specific Support
- **HubSpot**: [HubSpot Developer Support](https://developers.hubspot.com/support)
- **QuickBooks**: [Intuit Developer Support](https://developer.intuit.com/support)
- **Google Drive**: [Google Cloud Support](https://cloud.google.com/support)
- **Salesforce**: [Salesforce Developer Support](https://developer.salesforce.com/support)
- **Stripe**: [Stripe Support](https://support.stripe.com/)
- **PandaDoc**: [PandaDoc Developer Support](https://developers.pandadoc.com/support)

### RLDA Application Support
- Check application logs for detailed error information
- Review Firestore security rules and configuration
- Verify Firebase project setup and credentials
- Test with minimal data sets to isolate issues
- Consult platform-specific documentation for API changes

### Documentation Resources
- [Firebase Documentation](https://firebase.google.com/docs)
- [Streamlit Documentation](https://docs.streamlit.io/)
- [OAuth 2.0 Specification](https://tools.ietf.org/html/rfc6749)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

---

## 🎉 Conclusion

RLDA is a comprehensive SaaS application that provides:

- **Complete revenue leakage detection** across contracts, billing, and CRM
- **Secure cloud-based data storage** with Firestore integration
- **Seamless OAuth integrations** with 6 major business platforms
- **Automated data synchronization** with configurable scheduling
- **Real-time collaboration** for team-based analysis
- **Production-ready architecture** with comprehensive error handling

The application is designed to scale from individual users to enterprise teams, with robust security, comprehensive monitoring, and extensive customization options.

For questions, support, or feature requests, please refer to the troubleshooting section or contact the development team.

---

*Last updated: December 2024* 