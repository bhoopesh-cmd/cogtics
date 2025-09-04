import streamlit as st
import pyrebase
import json
from datetime import datetime, timedelta

# Load Firebase config from st.secrets or fallback to a placeholder
firebase_config = st.secrets.get("firebase", {
    "apiKey": "AIzaSyBLfqzjmRKvKRS1dXvI8Sa2yDI9s3eiuXo",
    "authDomain": "rlda-b46bb.firebaseapp.com",
    "projectId": "rlda-b46bb",
    "storageBucket": "rlda-b46bb.appspot.com",
    "messagingSenderId": "214889932957",
    "appId": "1:214889932957:web:cbf1e647dc7e1b19620c74",
    "databaseURL": ""
})

firebase = pyrebase.initialize_app(firebase_config)
auth = firebase.auth()

def save_auth_data(user_data, token_data):
    """Save authentication data to session state"""
    st.session_state["user"] = user_data
    st.session_state["auth_token"] = token_data
    st.session_state["auth_timestamp"] = datetime.now().isoformat()

def clear_auth_data():
    """Clear authentication data from session state"""
    for key in ["user", "auth_token", "auth_timestamp"]:
        if key in st.session_state:
            del st.session_state[key]

def is_token_valid():
    """Check if the stored token is still valid"""
    if "auth_timestamp" not in st.session_state:
        return False
    
    try:
        timestamp = datetime.fromisoformat(st.session_state["auth_timestamp"])
        # Token expires after 1 hour
        return datetime.now() - timestamp < timedelta(hours=1)
    except:
        return False

def refresh_token():
    """Attempt to refresh the Firebase token"""
    try:
        if "auth_token" in st.session_state and "user" in st.session_state:
            # Try to refresh the token
            user = auth.refresh(st.session_state["auth_token"]["refreshToken"])
            if user:
                save_auth_data(st.session_state["user"], user)
                return True
    except:
        pass
    return False

def login_user(email, password):
    try:
        if not email or not password:
            return "Please enter both email and password."
        if "@" not in email or "." not in email:
            return "Please enter a valid email address."
        user = auth.sign_in_with_email_and_password(email, password)
        account_info = auth.get_account_info(user['idToken'])
        user_info = account_info['users'][0]
        user_data = {
            "email": user_info.get("email"),
            "uid": user_info.get("localId"),
            "display_name": user_info.get("displayName", "")
        }
        save_auth_data(user_data, user)
        return user_data
    except Exception as e:
        error_msg = str(e)
        
        # Try to extract Firebase error code from the error message
        import json
        import re
        
        # Check if it's a JSON error response
        try:
            if "{" in error_msg and "}" in error_msg:
                # Extract JSON part from the error
                json_match = re.search(r'\{.*\}', error_msg)
                if json_match:
                    error_json = json.loads(json_match.group())
                    if "error" in error_json and "message" in error_json["error"]:
                        firebase_error = error_json["error"]["message"]
                    else:
                        firebase_error = error_msg
                else:
                    firebase_error = error_msg
            else:
                firebase_error = error_msg
        except:
            firebase_error = error_msg
        
        # Handle Firebase authentication errors
        firebase_error_lower = firebase_error.lower()
        
        if "invalid email" in firebase_error_lower or "invalid_email" in firebase_error_lower:
            return "Invalid email address format."
        elif "email not found" in firebase_error_lower or "email_not_found" in firebase_error_lower:
            return "Email not found. Please check your email or sign up."
        elif "invalid password" in firebase_error_lower or "invalid_password" in firebase_error_lower:
            return "Incorrect password. Please try again."
        elif "too many attempts" in firebase_error_lower or "too_many_attempts" in firebase_error_lower:
            return "Too many failed attempts. Please try again later."
        elif "user disabled" in firebase_error_lower or "user_disabled" in firebase_error_lower:
            return "This account has been disabled. Please contact support."
        elif "user not found" in firebase_error_lower or "user_not_found" in firebase_error_lower:
            return "Email not found. Please check your email or sign up."
        elif "weak password" in firebase_error_lower or "weak_password" in firebase_error_lower:
            return "Password is too weak. Please choose a stronger password."
        elif "permission denied" in firebase_error_lower or "permission_denied" in firebase_error_lower:
            return "Access denied. Please check your credentials."
        elif "network error" in firebase_error_lower or "network_error" in firebase_error_lower:
            return "Network error. Please check your internet connection."
        else:
            # For debugging, return a cleaner error message
            return f"Login failed. Please check your credentials and try again."

def signup_user(email, password, full_name="", phone_number="", company_name=""):
    try:
        if not email or not password:
            return "Please enter both email and password."
        if "@" not in email or "." not in email:
            return "Please enter a valid email address."
        if len(password) < 6:
            return "Password must be at least 6 characters long."
        user = auth.create_user_with_email_and_password(email, password)
        account_info = auth.get_account_info(user['idToken'])
        user_info = account_info['users'][0]
        user_data = {
            "email": user_info.get("email"),
            "uid": user_info.get("localId"),
            "display_name": user_info.get("displayName", ""),
            "full_name": full_name,
            "phone_number": phone_number,
            "company_name": company_name
        }
        save_auth_data(user_data, user)
        return user_data
    except Exception as e:
        error_msg = str(e)
        
        # Try to extract Firebase error code from the error message
        import json
        import re
        
        # Check if it's a JSON error response
        try:
            if "{" in error_msg and "}" in error_msg:
                # Extract JSON part from the error
                json_match = re.search(r'\{.*\}', error_msg)
                if json_match:
                    error_json = json.loads(json_match.group())
                    if "error" in error_json and "message" in error_json["error"]:
                        firebase_error = error_json["error"]["message"]
                    else:
                        firebase_error = error_msg
                else:
                    firebase_error = error_msg
            else:
                firebase_error = error_msg
        except:
            firebase_error = error_msg
        
        # Handle Firebase authentication errors
        firebase_error_lower = firebase_error.lower()
        
        if "email already exists" in firebase_error_lower or "email_exists" in firebase_error_lower:
            return "An account with this email already exists. Please log in instead."
        elif "invalid email" in firebase_error_lower or "invalid_email" in firebase_error_lower:
            return "Invalid email address format."
        elif "weak password" in firebase_error_lower or "weak_password" in firebase_error_lower:
            return "Password is too weak. Please choose a stronger password."
        elif "missing password" in firebase_error_lower or "missing_password" in firebase_error_lower:
            return "Password is required."
        elif "operation not allowed" in firebase_error_lower or "operation_not_allowed" in firebase_error_lower:
            return "Email/password sign up is not enabled. Please contact support."
        elif "permission denied" in firebase_error_lower or "permission_denied" in firebase_error_lower:
            return "Access denied. Please check your credentials."
        elif "network error" in firebase_error_lower or "network_error" in firebase_error_lower:
            return "Network error. Please check your internet connection."
        else:
            # For debugging, return a cleaner error message
            return f"Sign up failed. Please check your information and try again."

def logout_user():
    clear_auth_data()
    st.rerun()

def is_logged_in():
    # Check if user exists and token is valid
    if "user" not in st.session_state or st.session_state["user"] is None:
        return False
    
    # Check if token is still valid
    if not is_token_valid():
        # Try to refresh the token
        if not refresh_token():
            # If refresh fails, clear auth data
            clear_auth_data()
            return False
    
    return True

def get_user_email():
    if is_logged_in():
        return st.session_state["user"].get("email")
    return None

def get_user_full_name():
    if is_logged_in():
        return st.session_state["user"].get("full_name", "")
    return ""

def get_user_phone_number():
    if is_logged_in():
        return st.session_state["user"].get("phone_number", "")
    return ""

def get_user_company_name():
    if is_logged_in():
        return st.session_state["user"].get("company_name", "")
    return ""

def get_user_profile():
    """Get complete user profile information"""
    if is_logged_in():
        return {
            "email": st.session_state["user"].get("email"),
            "full_name": st.session_state["user"].get("full_name", ""),
            "phone_number": st.session_state["user"].get("phone_number", ""),
            "company_name": st.session_state["user"].get("company_name", ""),
            "uid": st.session_state["user"].get("uid")
        }
    return None 