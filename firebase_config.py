import streamlit as st
import os
from typing import Dict, Optional

def get_firebase_config() -> Dict:
    """Get Firebase configuration from various sources"""
    
    # First try to get from Streamlit secrets
    if hasattr(st, 'secrets') and st.secrets:
        firebase_config = st.secrets.get("firebase", {})
        if firebase_config:
            return firebase_config
    
    # Try environment variables
    env_config = {
        "apiKey": os.environ.get("FIREBASE_API_KEY"),
        "authDomain": os.environ.get("FIREBASE_AUTH_DOMAIN"),
        "projectId": os.environ.get("FIREBASE_PROJECT_ID"),
        "storageBucket": os.environ.get("FIREBASE_STORAGE_BUCKET"),
        "messagingSenderId": os.environ.get("FIREBASE_MESSAGING_SENDER_ID"),
        "appId": os.environ.get("FIREBASE_APP_ID"),
        "databaseURL": os.environ.get("FIREBASE_DATABASE_URL", "")
        
    }
    
    # Remove None values
    env_config = {k: v for k, v in env_config.items() if v is not None}
    if env_config:
        return env_config
    
    # Fallback to default config (for development)
    return {
        "apiKey": "AIzaSyBLfqzjmRKvKRS1dXvI8Sa2yDI9s3eiuXo",
        "authDomain": "rlda-b46bb.firebaseapp.com",
        "projectId": "rlda-b46bb",
        "storageBucket": "rlda-b46bb.appspot.com",
        "messagingSenderId": "214889932957",
        "appId": "1:214889932957:web:cbf1e647dc7e1b19620c74",
        "databaseURL": ""
    }

def get_service_account_config() -> Optional[Dict]:
    """Get Firebase service account configuration for Firestore"""
    
    # Try to get from Streamlit secrets
    if hasattr(st, 'secrets') and st.secrets:
        service_account = st.secrets.get("firebase_service_account", {})
        if service_account:
            # Create a copy to avoid modifying the original secrets object
            service_account_copy = dict(service_account)
            # Fix the private key format - convert \n to actual newlines
            if "private_key" in service_account_copy:
                service_account_copy["private_key"] = service_account_copy["private_key"].replace("\\n", "\n")
            return service_account_copy
    
    # Try environment variables
    env_service_account = {
        "type": "service_account",
        "project_id": os.environ.get("FIREBASE_PROJECT_ID"),
        "private_key_id": os.environ.get("FIREBASE_PRIVATE_KEY_ID"),
        "private_key": os.environ.get("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n"),
        "client_email": os.environ.get("FIREBASE_CLIENT_EMAIL"),
        "client_id": os.environ.get("FIREBASE_CLIENT_ID"),
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": os.environ.get("FIREBASE_CLIENT_X509_CERT_URL")
    }
    
    # Remove None values
    env_service_account = {k: v for k, v in env_service_account.items() if v is not None}
    if len(env_service_account) > 3:  # At least project_id, private_key, and client_email
        return env_service_account
    
    return None

def is_firebase_configured() -> bool:
    """Check if Firebase is properly configured"""
    config = get_firebase_config()
    service_account = get_service_account_config()
    
    # Basic config should have at least projectId
    has_basic_config = config.get("projectId") is not None
    
    # Service account should have at least project_id, private_key, and client_email
    has_service_account = (
        service_account is not None and
        service_account.get("project_id") is not None and
        service_account.get("private_key") is not None and
        service_account.get("client_email") is not None
    )
    
    return has_basic_config and has_service_account 