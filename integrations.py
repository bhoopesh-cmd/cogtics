"""
Integrations module for RLDA Streamlit app
Handles OAuth flows and data fetching for HubSpot, QuickBooks, Google Drive, Salesforce, Stripe, and PandaDoc
"""

import streamlit as st
import requests
import json
import base64
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from urllib.parse import urlencode, parse_qs, urlparse
import pandas as pd

# Import Firebase services
from firestore_service import store_integration_token, get_integration_token, get_user_id
from auth import get_user_email

# OAuth Configuration
OAUTH_CONFIGS = {
    "hubspot": {
        "client_id": st.secrets.get("hubspot", {}).get("client_id", ""),
        "client_secret": st.secrets.get("hubspot", {}).get("client_secret", ""),
        "redirect_uri": "http://localhost:8502/integrations/hubspot/callback",
        "auth_url": "https://app.hubspot.com/oauth/authorize",
        "token_url": "https://api.hubapi.com/oauth/v1/token",
        "scope": "contacts deals"
    },
    "quickbooks": {
        "client_id": st.secrets.get("quickbooks", {}).get("client_id", ""),
        "client_secret": st.secrets.get("quickbooks", {}).get("client_secret", ""),
        "redirect_uri": "http://localhost:8502/integrations/quickbooks/callback",
        "auth_url": "https://appcenter.intuit.com/connect/oauth2",
        "token_url": "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
        "scope": "com.intuit.quickbooks.accounting"
    },
    "google_drive": {
        "client_id": st.secrets.get("google_drive", {}).get("client_id", ""),
        "client_secret": st.secrets.get("google_drive", {}).get("client_secret", ""),
        "redirect_uri": "http://localhost:8502/integrations/google/callback",
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "scope": "https://www.googleapis.com/auth/drive.readonly"
    },
    "salesforce": {
        "client_id": st.secrets.get("salesforce", {}).get("client_id", ""),
        "client_secret": st.secrets.get("salesforce", {}).get("client_secret", ""),
        "redirect_uri": "http://localhost:8502/integrations/salesforce/callback",
        "auth_url": "https://login.salesforce.com/services/oauth2/authorize",
        "token_url": "https://login.salesforce.com/services/oauth2/token",
        "scope": "api refresh_token"
    },
    "stripe": {
        "client_id": st.secrets.get("stripe", {}).get("client_id", ""),
        "client_secret": st.secrets.get("stripe", {}).get("client_secret", ""),
        "redirect_uri": "http://localhost:8502/integrations/stripe/callback",
        "auth_url": "https://connect.stripe.com/oauth/authorize",
        "token_url": "https://connect.stripe.com/oauth/token",
        "scope": "read_write"
    },
    "pandadoc": {
        "client_id": st.secrets.get("pandadoc", {}).get("client_id", ""),
        "client_secret": st.secrets.get("pandadoc", {}).get("client_secret", ""),
        "redirect_uri": "http://localhost:8502/integrations/pandadoc/callback",
        "auth_url": "https://app.pandadoc.com/oauth2/authorize",
        "token_url": "https://app.pandadoc.com/oauth2/access_token",
        "scope": "read write"
    }
}

def get_oauth_url(platform: str) -> str:
    """Generate OAuth URL for the specified platform"""
    if platform not in OAUTH_CONFIGS:
        raise ValueError(f"Unsupported platform: {platform}")
    
    config = OAUTH_CONFIGS[platform]
    
    params = {
        "client_id": config["client_id"],
        "redirect_uri": config["redirect_uri"],
        "scope": config["scope"],
        "response_type": "code",
        "state": f"{platform}_{get_user_id()}"  # Include user ID in state
    }
    
    if platform == "quickbooks":
        params["response_type"] = "code"
    elif platform == "salesforce":
        params["response_type"] = "code"
    elif platform == "stripe":
        params["response_type"] = "code"
    elif platform == "pandadoc":
        params["response_type"] = "code"
    
    return f"{config['auth_url']}?{urlencode(params)}"

def exchange_code_for_token(platform: str, code: str) -> Optional[Dict]:
    """Exchange authorization code for access token"""
    if platform not in OAUTH_CONFIGS:
        return None
    
    config = OAUTH_CONFIGS[platform]
    
    data = {
        "client_id": config["client_id"],
        "client_secret": config["client_secret"],
        "redirect_uri": config["redirect_uri"],
        "code": code,
        "grant_type": "authorization_code"
    }
    
    try:
        response = requests.post(config["token_url"], data=data)
        if response.status_code == 200:
            token_data = response.json()
            
            # Store token in Firestore
            user_id = get_user_id()
            token_info = {
                "access_token": token_data.get("access_token"),
                "refresh_token": token_data.get("refresh_token"),
                "expires_in": token_data.get("expires_in"),
                "token_type": token_data.get("token_type"),
                "expires_at": datetime.now().timestamp() + token_data.get("expires_in", 3600),
                "platform": platform
            }
            
            # Handle platform-specific token fields
            if platform == "salesforce":
                token_info["instance_url"] = token_data.get("instance_url")
            elif platform == "stripe":
                token_info["stripe_user_id"] = token_data.get("stripe_user_id")
            elif platform == "pandadoc":
                token_info["workspace_id"] = token_data.get("workspace_id")
            
            if store_integration_token(user_id, platform, token_info):
                return token_info
        else:
            st.error(f"Token exchange failed: {response.text}")
            return None
    except Exception as e:
        st.error(f"Error exchanging code for token: {e}")
        return None

def is_integration_connected(platform: str) -> bool:
    """Check if integration is connected for current user"""
    user_id = get_user_id()
    token = get_integration_token(user_id, platform)
    return token is not None and not is_token_expired(token)

def is_token_expired(token: Dict) -> bool:
    """Check if token is expired"""
    expires_at = token.get("expires_at", 0)
    return datetime.now().timestamp() > expires_at

def refresh_token_if_needed(platform: str) -> Optional[Dict]:
    """Refresh token if expired"""
    user_id = get_user_id()
    token = get_integration_token(user_id, platform)
    
    if not token:
        return None
    
    if not is_token_expired(token):
        return token
    
    # Token is expired, need to refresh
    config = OAUTH_CONFIGS[platform]
    refresh_token = token.get("refresh_token")
    
    if not refresh_token:
        return None
    
    data = {
        "client_id": config["client_id"],
        "client_secret": config["client_secret"],
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }
    
    try:
        response = requests.post(config["token_url"], data=data)
        if response.status_code == 200:
            new_token_data = response.json()
            
            # Update token in Firestore
            updated_token = {
                "access_token": new_token_data.get("access_token"),
                "refresh_token": new_token_data.get("refresh_token", refresh_token),
                "expires_in": new_token_data.get("expires_in"),
                "token_type": new_token_data.get("token_type"),
                "expires_at": datetime.now().timestamp() + new_token_data.get("expires_in", 3600),
                "platform": platform
            }
            
            # Preserve platform-specific fields
            if platform == "salesforce":
                updated_token["instance_url"] = token.get("instance_url")
            elif platform == "stripe":
                updated_token["stripe_user_id"] = token.get("stripe_user_id")
            elif platform == "pandadoc":
                updated_token["workspace_id"] = token.get("workspace_id")
            
            if store_integration_token(user_id, platform, updated_token):
                return updated_token
        else:
            st.error(f"Token refresh failed: {response.text}")
            return None
    except Exception as e:
        st.error(f"Error refreshing token: {e}")
        return None

# HubSpot Integration
def fetch_hubspot_deals() -> Optional[pd.DataFrame]:
    """Fetch deals data from HubSpot"""
    token = refresh_token_if_needed("hubspot")
    if not token:
        return None
    
    try:
        headers = {
            "Authorization": f"Bearer {token['access_token']}",
            "Content-Type": "application/json"
        }
        
        # Fetch deals
        deals_url = "https://api.hubapi.com/crm/v3/objects/deals"
        params = {
            "limit": 100,
            "properties": "amount,dealname,dealstage,closedate,createdate,hs_is_closed,hs_is_closed_won"
        }
        
        response = requests.get(deals_url, headers=headers, params=params)
        if response.status_code == 200:
            deals_data = response.json()
            deals = deals_data.get("results", [])
            
            # Convert to DataFrame
            df_data = []
            for deal in deals:
                properties = deal.get("properties", {})
                df_data.append({
                    "Deal ID": deal.get("id"),
                    "Deal Name": properties.get("dealname"),
                    "Amount": properties.get("amount"),
                    "Stage": properties.get("dealstage"),
                    "Close Date": properties.get("closedate"),
                    "Create Date": properties.get("createdate"),
                    "Is Closed": properties.get("hs_is_closed"),
                    "Is Won": properties.get("hs_is_closed_won")
                })
            
            return pd.DataFrame(df_data)
        else:
            st.error(f"Failed to fetch HubSpot deals: {response.text}")
            return None
    except Exception as e:
        st.error(f"Error fetching HubSpot deals: {e}")
        return None

# QuickBooks Integration
def fetch_quickbooks_invoices() -> Optional[pd.DataFrame]:
    """Fetch invoice data from QuickBooks"""
    token = refresh_token_if_needed("quickbooks")
    if not token:
        return None
    
    try:
        headers = {
            "Authorization": f"Bearer {token['access_token']}",
            "Accept": "application/json"
        }
        
        # Fetch invoices
        invoices_url = "https://sandbox-accounts.platform.intuit.com/v1/companies/{realm_id}/query"
        # Note: You'll need to get the realm_id from the user's QuickBooks account
        
        query = "SELECT * FROM Invoice MAXRESULTS 100"
        params = {"query": query}
        
        response = requests.get(invoices_url, headers=headers, params=params)
        if response.status_code == 200:
            invoices_data = response.json()
            invoices = invoices_data.get("QueryResponse", {}).get("Invoice", [])
            
            # Convert to DataFrame
            df_data = []
            for invoice in invoices:
                df_data.append({
                    "Invoice ID": invoice.get("Id"),
                    "Customer": invoice.get("CustomerRef", {}).get("name"),
                    "Amount": invoice.get("TotalAmt"),
                    "Balance": invoice.get("Balance"),
                    "Due Date": invoice.get("DueDate"),
                    "Create Date": invoice.get("MetaData", {}).get("CreateTime"),
                    "Status": invoice.get("EmailStatus")
                })
            
            return pd.DataFrame(df_data)
        else:
            st.error(f"Failed to fetch QuickBooks invoices: {response.text}")
            return None
    except Exception as e:
        st.error(f"Error fetching QuickBooks invoices: {e}")
        return None

# Google Drive Integration
def fetch_google_drive_contracts() -> Optional[pd.DataFrame]:
    """Fetch contract files from Google Drive"""
    token = refresh_token_if_needed("google_drive")
    if not token:
        return None
    
    try:
        headers = {
            "Authorization": f"Bearer {token['access_token']}",
            "Content-Type": "application/json"
        }
        
        # Search for contract-related files
        drive_url = "https://www.googleapis.com/drive/v3/files"
        params = {
            "q": "name contains 'contract' OR name contains 'agreement' OR mimeType contains 'pdf'",
            "fields": "files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink)",
            "orderBy": "modifiedTime desc",
            "pageSize": 50
        }
        
        response = requests.get(drive_url, headers=headers, params=params)
        if response.status_code == 200:
            files_data = response.json()
            files = files_data.get("files", [])
            
            # Convert to DataFrame
            df_data = []
            for file in files:
                df_data.append({
                    "File ID": file.get("id"),
                    "File Name": file.get("name"),
                    "Type": file.get("mimeType"),
                    "Size": file.get("size"),
                    "Created": file.get("createdTime"),
                    "Modified": file.get("modifiedTime"),
                    "Link": file.get("webViewLink")
                })
            
            return pd.DataFrame(df_data)
        else:
            st.error(f"Failed to fetch Google Drive files: {response.text}")
            return None
    except Exception as e:
        st.error(f"Error fetching Google Drive files: {e}")
        return None

# Salesforce Integration
def fetch_salesforce_opportunities() -> Optional[pd.DataFrame]:
    """Fetch opportunities data from Salesforce"""
    token = refresh_token_if_needed("salesforce")
    if not token:
        return None
    
    try:
        instance_url = token.get("instance_url")
        if not instance_url:
            st.error("Salesforce instance URL not found")
            return None
        
        headers = {
            "Authorization": f"Bearer {token['access_token']}",
            "Content-Type": "application/json"
        }
        
        # Fetch opportunities
        query = """
        SELECT Id, Name, Amount, StageName, CloseDate, CreatedDate, 
               Probability, Type, LeadSource, Description
        FROM Opportunity 
        ORDER BY CreatedDate DESC 
        LIMIT 100
        """
        
        query_url = f"{instance_url}/services/data/v58.0/query"
        params = {"q": query}
        
        response = requests.get(query_url, headers=headers, params=params)
        if response.status_code == 200:
            data = response.json()
            opportunities = data.get("records", [])
            
            # Convert to DataFrame
            df_data = []
            for opp in opportunities:
                df_data.append({
                    "Opportunity ID": opp.get("Id"),
                    "Name": opp.get("Name"),
                    "Amount": opp.get("Amount"),
                    "Stage": opp.get("StageName"),
                    "Close Date": opp.get("CloseDate"),
                    "Created Date": opp.get("CreatedDate"),
                    "Probability": opp.get("Probability"),
                    "Type": opp.get("Type"),
                    "Lead Source": opp.get("LeadSource"),
                    "Description": opp.get("Description")
                })
            
            return pd.DataFrame(df_data)
        else:
            st.error(f"Failed to fetch Salesforce opportunities: {response.text}")
            return None
    except Exception as e:
        st.error(f"Error fetching Salesforce opportunities: {e}")
        return None

def fetch_salesforce_contracts() -> Optional[pd.DataFrame]:
    """Fetch contracts data from Salesforce"""
    token = refresh_token_if_needed("salesforce")
    if not token:
        return None
    
    try:
        instance_url = token.get("instance_url")
        if not instance_url:
            st.error("Salesforce instance URL not found")
            return None
        
        headers = {
            "Authorization": f"Bearer {token['access_token']}",
            "Content-Type": "application/json"
        }
        
        # Fetch contracts
        query = """
        SELECT Id, ContractNumber, AccountId, Status, StartDate, EndDate,
               ContractTerm, BillingStreet, BillingCity, BillingState,
               BillingPostalCode, BillingCountry, Description
        FROM Contract 
        ORDER BY CreatedDate DESC 
        LIMIT 100
        """
        
        query_url = f"{instance_url}/services/data/v58.0/query"
        params = {"q": query}
        
        response = requests.get(query_url, headers=headers, params=params)
        if response.status_code == 200:
            data = response.json()
            contracts = data.get("records", [])
            
            # Convert to DataFrame
            df_data = []
            for contract in contracts:
                df_data.append({
                    "Contract ID": contract.get("Id"),
                    "Contract Number": contract.get("ContractNumber"),
                    "Account ID": contract.get("AccountId"),
                    "Status": contract.get("Status"),
                    "Start Date": contract.get("StartDate"),
                    "End Date": contract.get("EndDate"),
                    "Contract Term": contract.get("ContractTerm"),
                    "Billing Street": contract.get("BillingStreet"),
                    "Billing City": contract.get("BillingCity"),
                    "Billing State": contract.get("BillingState"),
                    "Billing Postal Code": contract.get("BillingPostalCode"),
                    "Billing Country": contract.get("BillingCountry"),
                    "Description": contract.get("Description")
                })
            
            return pd.DataFrame(df_data)
        else:
            st.error(f"Failed to fetch Salesforce contracts: {response.text}")
            return None
    except Exception as e:
        st.error(f"Error fetching Salesforce contracts: {e}")
        return None

# Stripe Integration
def fetch_stripe_invoices() -> Optional[pd.DataFrame]:
    """Fetch invoices data from Stripe"""
    token = refresh_token_if_needed("stripe")
    if not token:
        return None
    
    try:
        headers = {
            "Authorization": f"Bearer {token['access_token']}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        # Fetch invoices
        invoices_url = "https://api.stripe.com/v1/invoices"
        params = {
            "limit": 100,
            "expand[]": "data.customer"
        }
        
        response = requests.get(invoices_url, headers=headers, params=params)
        if response.status_code == 200:
            data = response.json()
            invoices = data.get("data", [])
            
            # Convert to DataFrame
            df_data = []
            for invoice in invoices:
                customer = invoice.get("customer", {})
                df_data.append({
                    "Invoice ID": invoice.get("id"),
                    "Customer ID": invoice.get("customer"),
                    "Customer Email": customer.get("email") if isinstance(customer, dict) else None,
                    "Amount": invoice.get("amount_paid"),
                    "Currency": invoice.get("currency"),
                    "Status": invoice.get("status"),
                    "Due Date": datetime.fromtimestamp(invoice.get("due_date", 0)).strftime('%Y-%m-%d') if invoice.get("due_date") else None,
                    "Created": datetime.fromtimestamp(invoice.get("created", 0)).strftime('%Y-%m-%d'),
                    "Description": invoice.get("description"),
                    "Collection Method": invoice.get("collection_method")
                })
            
            return pd.DataFrame(df_data)
        else:
            st.error(f"Failed to fetch Stripe invoices: {response.text}")
            return None
    except Exception as e:
        st.error(f"Error fetching Stripe invoices: {e}")
        return None

def fetch_stripe_subscriptions() -> Optional[pd.DataFrame]:
    """Fetch subscriptions data from Stripe"""
    token = refresh_token_if_needed("stripe")
    if not token:
        return None
    
    try:
        headers = {
            "Authorization": f"Bearer {token['access_token']}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        # Fetch subscriptions
        subscriptions_url = "https://api.stripe.com/v1/subscriptions"
        params = {
            "limit": 100,
            "expand[]": "data.customer"
        }
        
        response = requests.get(subscriptions_url, headers=headers, params=params)
        if response.status_code == 200:
            data = response.json()
            subscriptions = data.get("data", [])
            
            # Convert to DataFrame
            df_data = []
            for sub in subscriptions:
                customer = sub.get("customer", {})
                df_data.append({
                    "Subscription ID": sub.get("id"),
                    "Customer ID": sub.get("customer"),
                    "Customer Email": customer.get("email") if isinstance(customer, dict) else None,
                    "Status": sub.get("status"),
                    "Current Period Start": datetime.fromtimestamp(sub.get("current_period_start", 0)).strftime('%Y-%m-%d'),
                    "Current Period End": datetime.fromtimestamp(sub.get("current_period_end", 0)).strftime('%Y-%m-%d'),
                    "Amount": sub.get("items", {}).get("data", [{}])[0].get("price", {}).get("unit_amount"),
                    "Currency": sub.get("currency"),
                    "Created": datetime.fromtimestamp(sub.get("created", 0)).strftime('%Y-%m-%d'),
                    "Cancel At Period End": sub.get("cancel_at_period_end")
                })
            
            return pd.DataFrame(df_data)
        else:
            st.error(f"Failed to fetch Stripe subscriptions: {response.text}")
            return None
    except Exception as e:
        st.error(f"Error fetching Stripe subscriptions: {e}")
        return None

# PandaDoc Integration
def fetch_pandadoc_documents() -> Optional[pd.DataFrame]:
    """Fetch documents data from PandaDoc"""
    token = refresh_token_if_needed("pandadoc")
    if not token:
        return None
    
    try:
        headers = {
            "Authorization": f"Bearer {token['access_token']}",
            "Content-Type": "application/json"
        }
        
        # Fetch documents
        documents_url = "https://api.pandadoc.com/public/v1/documents"
        params = {
            "count": 100,
            "page": 1
        }
        
        response = requests.get(documents_url, headers=headers, params=params)
        if response.status_code == 200:
            data = response.json()
            documents = data.get("results", [])
            
            # Convert to DataFrame
            df_data = []
            for doc in documents:
                df_data.append({
                    "Document ID": doc.get("id"),
                    "Name": doc.get("name"),
                    "Status": doc.get("status"),
                    "Type": doc.get("type"),
                    "Created": doc.get("date_created"),
                    "Modified": doc.get("date_modified"),
                    "Completed": doc.get("date_completed"),
                    "Expires": doc.get("date_expires"),
                    "Tags": ", ".join(doc.get("tags", [])),
                    "Recipients": len(doc.get("recipients", [])),
                    "Content": doc.get("content")
                })
            
            return pd.DataFrame(df_data)
        else:
            st.error(f"Failed to fetch PandaDoc documents: {response.text}")
            return None
    except Exception as e:
        st.error(f"Error fetching PandaDoc documents: {e}")
        return None

def fetch_pandadoc_templates() -> Optional[pd.DataFrame]:
    """Fetch templates data from PandaDoc"""
    token = refresh_token_if_needed("pandadoc")
    if not token:
        return None
    
    try:
        headers = {
            "Authorization": f"Bearer {token['access_token']}",
            "Content-Type": "application/json"
        }
        
        # Fetch templates
        templates_url = "https://api.pandadoc.com/public/v1/templates"
        params = {
            "count": 100,
            "page": 1
        }
        
        response = requests.get(templates_url, headers=headers, params=params)
        if response.status_code == 200:
            data = response.json()
            templates = data.get("results", [])
            
            # Convert to DataFrame
            df_data = []
            for template in templates:
                df_data.append({
                    "Template ID": template.get("id"),
                    "Name": template.get("name"),
                    "Type": template.get("type"),
                    "Created": template.get("date_created"),
                    "Modified": template.get("date_modified"),
                    "Tags": ", ".join(template.get("tags", [])),
                    "Content": template.get("content"),
                    "Version": template.get("version")
                })
            
            return pd.DataFrame(df_data)
        else:
            st.error(f"Failed to fetch PandaDoc templates: {response.text}")
            return None
    except Exception as e:
        st.error(f"Error fetching PandaDoc templates: {e}")
        return None

def download_google_drive_file(file_id: str) -> Optional[bytes]:
    """Download a specific file from Google Drive"""
    token = refresh_token_if_needed("google_drive")
    if not token:
        return None
    
    try:
        headers = {
            "Authorization": f"Bearer {token['access_token']}"
        }
        
        download_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
        response = requests.get(download_url, headers=headers)
        
        if response.status_code == 200:
            return response.content
        else:
            st.error(f"Failed to download file: {response.text}")
            return None
    except Exception as e:
        st.error(f"Error downloading file: {e}")
        return None

def show_integrations_tab():
    """Display the integrations tab"""
    st.header("🔗 Integrations")
    st.write("Connect your external tools to automatically fetch data for RLDA analysis.")
    
    # Integration Cards - First Row
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.subheader("📊 HubSpot CRM")
        st.write("Connect to fetch deals and customer data")
        
        if is_integration_connected("hubspot"):
            st.success("✅ Connected")
            if st.button("🔍 Analyze Deals", key="analyze_hubspot"):
                with st.spinner("Fetching HubSpot deals..."):
                    deals_df = fetch_hubspot_deals()
                    if deals_df is not None and not deals_df.empty:
                        st.success(f"Fetched {len(deals_df)} deals from HubSpot")
                        st.dataframe(deals_df, use_container_width=True)
                        
                        # Store in session state for analysis
                        st.session_state["hubspot_deals"] = deals_df.to_dict('records')
                        st.session_state["hubspot_analyzed"] = True
                        
                        # Trigger CRM analysis
                        st.info("Deals data ready for CRM analysis. Go to CRM tab to analyze.")
                    else:
                        st.error("No deals found or failed to fetch data")
        else:
            st.warning("❌ Not Connected")
            if st.button("🔗 Connect HubSpot", key="connect_hubspot"):
                oauth_url = get_oauth_url("hubspot")
                st.markdown(f"[Click here to authorize HubSpot]({oauth_url})")
    
    with col2:
        st.subheader("💰 QuickBooks")
        st.write("Connect to fetch invoices and billing data")
        
        if is_integration_connected("quickbooks"):
            st.success("✅ Connected")
            if st.button("🔍 Analyze Invoices", key="analyze_quickbooks"):
                with st.spinner("Fetching QuickBooks invoices..."):
                    invoices_df = fetch_quickbooks_invoices()
                    if invoices_df is not None and not invoices_df.empty:
                        st.success(f"Fetched {len(invoices_df)} invoices from QuickBooks")
                        st.dataframe(invoices_df, use_container_width=True)
                        
                        # Store in session state for analysis
                        st.session_state["quickbooks_invoices"] = invoices_df.to_dict('records')
                        st.session_state["billing_analyzed"] = True
                        
                        # Trigger billing analysis
                        st.info("Invoice data ready for billing analysis. Go to Billing tab to analyze.")
                    else:
                        st.error("No invoices found or failed to fetch data")
        else:
            st.warning("❌ Not Connected")
            if st.button("🔗 Connect QuickBooks", key="connect_quickbooks"):
                oauth_url = get_oauth_url("quickbooks")
                st.markdown(f"[Click here to authorize QuickBooks]({oauth_url})")
    
    with col3:
        st.subheader("📁 Google Drive")
        st.write("Connect to fetch contract files")
        
        if is_integration_connected("google_drive"):
            st.success("✅ Connected")
            if st.button("🔍 Analyze Contracts", key="analyze_google_drive"):
                with st.spinner("Fetching Google Drive contracts..."):
                    contracts_df = fetch_google_drive_contracts()
                    if contracts_df is not None and not contracts_df.empty:
                        st.success(f"Fetched {len(contracts_df)} contract files from Google Drive")
                        st.dataframe(contracts_df, use_container_width=True)
                        
                        # Store in session state for analysis
                        st.session_state["google_drive_contracts"] = contracts_df.to_dict('records')
                        st.session_state["contract_analyzed"] = True
                        
                        # Trigger contract analysis
                        st.info("Contract files ready for analysis. Go to Contract tab to analyze.")
                    else:
                        st.error("No contract files found or failed to fetch data")
        else:
            st.warning("❌ Not Connected")
            if st.button("🔗 Connect Google Drive", key="connect_google_drive"):
                oauth_url = get_oauth_url("google_drive")
                st.markdown(f"[Click here to authorize Google Drive]({oauth_url})")
    
    # Integration Cards - Second Row
    col4, col5, col6 = st.columns(3)
    
    with col4:
        st.subheader("☁️ Salesforce")
        st.write("Connect to fetch opportunities and contracts")
        
        if is_integration_connected("salesforce"):
            st.success("✅ Connected")
            
            # Two buttons for different data types
            col4a, col4b = st.columns(2)
            with col4a:
                if st.button("🔍 Analyze Opportunities", key="analyze_salesforce_opps"):
                    with st.spinner("Fetching Salesforce opportunities..."):
                        opps_df = fetch_salesforce_opportunities()
                        if opps_df is not None and not opps_df.empty:
                            st.success(f"Fetched {len(opps_df)} opportunities from Salesforce")
                            st.dataframe(opps_df, use_container_width=True)
                            
                            # Store in session state for analysis
                            st.session_state["salesforce_opportunities"] = opps_df.to_dict('records')
                            st.session_state["crm_analyzed"] = True
                            
                            st.info("Opportunities data ready for CRM analysis. Go to CRM tab to analyze.")
                        else:
                            st.error("No opportunities found or failed to fetch data")
            
            with col4b:
                if st.button("🔍 Analyze Contracts", key="analyze_salesforce_contracts"):
                    with st.spinner("Fetching Salesforce contracts..."):
                        contracts_df = fetch_salesforce_contracts()
                        if contracts_df is not None and not contracts_df.empty:
                            st.success(f"Fetched {len(contracts_df)} contracts from Salesforce")
                            st.dataframe(contracts_df, use_container_width=True)
                            
                            # Store in session state for analysis
                            st.session_state["salesforce_contracts"] = contracts_df.to_dict('records')
                            st.session_state["contract_analyzed"] = True
                            
                            st.info("Contracts data ready for analysis. Go to Contract tab to analyze.")
                        else:
                            st.error("No contracts found or failed to fetch data")
        else:
            st.warning("❌ Not Connected")
            if st.button("🔗 Connect Salesforce", key="connect_salesforce"):
                oauth_url = get_oauth_url("salesforce")
                st.markdown(f"[Click here to authorize Salesforce]({oauth_url})")
    
    with col5:
        st.subheader("💳 Stripe")
        st.write("Connect to fetch invoices and subscriptions")
        
        if is_integration_connected("stripe"):
            st.success("✅ Connected")
            
            # Two buttons for different data types
            col5a, col5b = st.columns(2)
            with col5a:
                if st.button("🔍 Analyze Invoices", key="analyze_stripe_invoices"):
                    with st.spinner("Fetching Stripe invoices..."):
                        invoices_df = fetch_stripe_invoices()
                        if invoices_df is not None and not invoices_df.empty:
                            st.success(f"Fetched {len(invoices_df)} invoices from Stripe")
                            st.dataframe(invoices_df, use_container_width=True)
                            
                            # Store in session state for analysis
                            st.session_state["stripe_invoices"] = invoices_df.to_dict('records')
                            st.session_state["billing_analyzed"] = True
                            
                            st.info("Invoice data ready for billing analysis. Go to Billing tab to analyze.")
                        else:
                            st.error("No invoices found or failed to fetch data")
            
            with col5b:
                if st.button("🔍 Analyze Subscriptions", key="analyze_stripe_subscriptions"):
                    with st.spinner("Fetching Stripe subscriptions..."):
                        subs_df = fetch_stripe_subscriptions()
                        if subs_df is not None and not subs_df.empty:
                            st.success(f"Fetched {len(subs_df)} subscriptions from Stripe")
                            st.dataframe(subs_df, use_container_width=True)
                            
                            # Store in session state for analysis
                            st.session_state["stripe_subscriptions"] = subs_df.to_dict('records')
                            st.session_state["billing_analyzed"] = True
                            
                            st.info("Subscription data ready for billing analysis. Go to Billing tab to analyze.")
                        else:
                            st.error("No subscriptions found or failed to fetch data")
        else:
            st.warning("❌ Not Connected")
            if st.button("🔗 Connect Stripe", key="connect_stripe"):
                oauth_url = get_oauth_url("stripe")
                st.markdown(f"[Click here to authorize Stripe]({oauth_url})")
    
    with col6:
        st.subheader("📄 PandaDoc")
        st.write("Connect to fetch documents and templates")
        
        if is_integration_connected("pandadoc"):
            st.success("✅ Connected")
            
            # Two buttons for different data types
            col6a, col6b = st.columns(2)
            with col6a:
                if st.button("🔍 Analyze Documents", key="analyze_pandadoc_docs"):
                    with st.spinner("Fetching PandaDoc documents..."):
                        docs_df = fetch_pandadoc_documents()
                        if docs_df is not None and not docs_df.empty:
                            st.success(f"Fetched {len(docs_df)} documents from PandaDoc")
                            st.dataframe(docs_df, use_container_width=True)
                            
                            # Store in session state for analysis
                            st.session_state["pandadoc_documents"] = docs_df.to_dict('records')
                            st.session_state["contract_analyzed"] = True
                            
                            st.info("Documents data ready for contract analysis. Go to Contract tab to analyze.")
                        else:
                            st.error("No documents found or failed to fetch data")
            
            with col6b:
                if st.button("🔍 Analyze Templates", key="analyze_pandadoc_templates"):
                    with st.spinner("Fetching PandaDoc templates..."):
                        templates_df = fetch_pandadoc_templates()
                        if templates_df is not None and not templates_df.empty:
                            st.success(f"Fetched {len(templates_df)} templates from PandaDoc")
                            st.dataframe(templates_df, use_container_width=True)
                            
                            # Store in session state for analysis
                            st.session_state["pandadoc_templates"] = templates_df.to_dict('records')
                            st.session_state["contract_analyzed"] = True
                            
                            st.info("Templates data ready for contract analysis. Go to Contract tab to analyze.")
                        else:
                            st.error("No templates found or failed to fetch data")
        else:
            st.warning("❌ Not Connected")
            if st.button("🔗 Connect PandaDoc", key="connect_pandadoc"):
                oauth_url = get_oauth_url("pandadoc")
                st.markdown(f"[Click here to authorize PandaDoc]({oauth_url})")
    
    # OAuth Callback Handler
    if st.experimental_get_query_params().get("code"):
        code = st.experimental_get_query_params()["code"][0]
        state = st.experimental_get_query_params().get("state", [""])[0]
        
        if state.startswith("hubspot_"):
            with st.spinner("Connecting to HubSpot..."):
                token_info = exchange_code_for_token("hubspot", code)
                if token_info:
                    st.success("HubSpot connected successfully!")
                    st.rerun()
                else:
                    st.error("Failed to connect to HubSpot")
        
        elif state.startswith("quickbooks_"):
            with st.spinner("Connecting to QuickBooks..."):
                token_info = exchange_code_for_token("quickbooks", code)
                if token_info:
                    st.success("QuickBooks connected successfully!")
                    st.rerun()
                else:
                    st.error("Failed to connect to QuickBooks")
        
        elif state.startswith("google_drive_"):
            with st.spinner("Connecting to Google Drive..."):
                token_info = exchange_code_for_token("google_drive", code)
                if token_info:
                    st.success("Google Drive connected successfully!")
                    st.rerun()
                else:
                    st.error("Failed to connect to Google Drive")
        
        elif state.startswith("salesforce_"):
            with st.spinner("Connecting to Salesforce..."):
                token_info = exchange_code_for_token("salesforce", code)
                if token_info:
                    st.success("Salesforce connected successfully!")
                    st.rerun()
                else:
                    st.error("Failed to connect to Salesforce")
        
        elif state.startswith("stripe_"):
            with st.spinner("Connecting to Stripe..."):
                token_info = exchange_code_for_token("stripe", code)
                if token_info:
                    st.success("Stripe connected successfully!")
                    st.rerun()
                else:
                    st.error("Failed to connect to Stripe")
        
        elif state.startswith("pandadoc_"):
            with st.spinner("Connecting to PandaDoc..."):
                token_info = exchange_code_for_token("pandadoc", code)
                if token_info:
                    st.success("PandaDoc connected successfully!")
                    st.rerun()
                else:
                    st.error("Failed to connect to PandaDoc")
    
    # Integration Status
    st.subheader("📊 Integration Status")
    
    status_data = []
    for platform in ["hubspot", "quickbooks", "google_drive", "salesforce", "stripe", "pandadoc"]:
        connected = is_integration_connected(platform)
        status_data.append({
            "Platform": platform.title(),
            "Status": "✅ Connected" if connected else "❌ Not Connected",
            "Last Sync": "N/A"  # Could be enhanced to track last sync time
        })
    
    status_df = pd.DataFrame(status_data)
    st.dataframe(status_df, use_container_width=True)
    
    # Disconnect buttons
    st.subheader("🔧 Manage Integrations")
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("🚫 Disconnect HubSpot", key="disconnect_hubspot"):
            # TODO: Implement disconnect functionality
            st.warning("Disconnect functionality not implemented yet")
        
        if st.button("🚫 Disconnect Salesforce", key="disconnect_salesforce"):
            # TODO: Implement disconnect functionality
            st.warning("Disconnect functionality not implemented yet")
    
    with col2:
        if st.button("🚫 Disconnect QuickBooks", key="disconnect_quickbooks"):
            # TODO: Implement disconnect functionality
            st.warning("Disconnect functionality not implemented yet")
        
        if st.button("🚫 Disconnect Stripe", key="disconnect_stripe"):
            # TODO: Implement disconnect functionality
            st.warning("Disconnect functionality not implemented yet")
    
    with col3:
        if st.button("🚫 Disconnect Google Drive", key="disconnect_google_drive"):
            # TODO: Implement disconnect functionality
            st.warning("Disconnect functionality not implemented yet")
        
        if st.button("🚫 Disconnect PandaDoc", key="disconnect_pandadoc"):
            # TODO: Implement disconnect functionality
            st.warning("Disconnect functionality not implemented yet")