import streamlit as st
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta
import json
from typing import Dict, List, Optional, Any
import uuid

# Initialize Firestore
def init_firestore():
    """Initialize Firestore connection"""
    try:
        # Check if already initialized
        if not firebase_admin._apps:
            from firebase_config import get_service_account_config
            
            service_account = get_service_account_config()
            if service_account:
                # Debug: Check if required fields are present
                required_fields = ["type", "project_id", "private_key", "client_email"]
                missing_fields = [field for field in required_fields if field not in service_account or not service_account[field]]
                
                if missing_fields:
                    st.error(f"Missing required service account fields: {missing_fields}")
                    return None
                
                try:
                    cred = credentials.Certificate(service_account)
                    firebase_admin.initialize_app(cred)
                except Exception as cert_error:
                    st.error(f"Certificate creation failed: {cert_error}")
                    return None
            else:
                st.warning("Firebase service account not configured. Firestore features will be disabled.")
                return None
        
        return firestore.client()
    except Exception as e:
        st.error(f"Failed to initialize Firestore: {e}")
        return None

def get_user_id():
    """Get current user ID from session state"""
    user = st.session_state.get("user", {})
    return user.get("uid") or user.get("email", "anonymous")

def get_user_email():
    """Get current user email from session state"""
    user = st.session_state.get("user", {})
    return user.get("email", "anonymous")

# Feedback Management
def store_feedback(section: str, mode: str, issue: str, severity: str, feedback: str) -> bool:
    """Store user feedback in Firestore"""
    try:
        db = init_firestore()
        if not db:
            return False
            
        user_id = get_user_id()
        user_email = get_user_email()
        
        feedback_data = {
            "user_id": user_id,
            "user_email": user_email,
            "section": section,
            "mode": mode,
            "issue": issue,
            "severity": severity,
            "feedback": feedback,
            "timestamp": datetime.now().isoformat(),
            "created_at": firestore.SERVER_TIMESTAMP
        }
        
        db.collection("feedback").add(feedback_data)
        return True
    except Exception as e:
        st.error(f"Failed to store feedback: {e}")
        return False

def get_user_feedback(user_id: Optional[str] = None) -> List[Dict]:
    """Retrieve feedback for a specific user"""
    try:
        db = init_firestore()
        if not db:
            return []
            
        if not user_id:
            user_id = get_user_id()
            
        feedback_list = []
        
        try:
            feedback_docs = db.collection("feedback").where("user_id", "==", user_id).order_by("created_at", direction=firestore.Query.DESCENDING).stream()
            
            # Process the results
            for doc in feedback_docs:
                data = doc.to_dict()
                data["id"] = doc.id
                feedback_list.append(data)
                
        except Exception as index_error:
            # Fallback: try without ordering if index is missing
            st.warning("Feedback index not found, retrieving results without ordering.")
            try:
                feedback_docs = db.collection("feedback").where("user_id", "==", user_id).stream()
                
                # Process the fallback results
                for doc in feedback_docs:
                    data = doc.to_dict()
                    data["id"] = doc.id
                    feedback_list.append(data)
            except Exception as fallback_error:
                st.error(f"Failed to retrieve feedback: {fallback_error}")
                return []
            
        return feedback_list
    except Exception as e:
        st.error(f"Failed to retrieve feedback: {e}")
        return []

def get_all_feedback() -> List[Dict]:
    """Retrieve all feedback for admin purposes"""
    try:
        db = init_firestore()
        if not db:
            return []
            
        feedback_ref = db.collection("feedback")
        feedback_docs = feedback_ref.order_by("created_at", direction=firestore.Query.DESCENDING).stream()
        
        feedback_list = []
        for doc in feedback_docs:
            data = doc.to_dict()
            data["id"] = doc.id
            feedback_list.append(data)
            
        return feedback_list
    except Exception as e:
        st.error(f"Failed to retrieve all feedback: {e}")
        return []

# Analysis Results Storage
def store_analysis_results(analysis_type: str, results: List[Dict], metadata: Dict = None) -> str:
    """Store analysis results in Firestore"""
    try:
        db = init_firestore()
        if not db:
            return None
            
        user_id = get_user_id()
        user_email = get_user_email()
        
        analysis_data = {
            "user_id": user_id,
            "user_email": user_email,
            "analysis_type": analysis_type,  # "contract", "billing", "crm"
            "results": results,
            "metadata": metadata or {},
            "timestamp": datetime.now().isoformat(),
            "created_at": firestore.SERVER_TIMESTAMP
        }
        
        doc_ref = db.collection("analysis_results").add(analysis_data)
        return doc_ref[1].id
    except Exception as e:
        st.error(f"Failed to store analysis results: {e}")
        return None

def get_user_analysis_results(user_id: Optional[str] = None, analysis_type: Optional[str] = None) -> List[Dict]:
    """Retrieve analysis results for a user"""
    try:
        db = init_firestore()
        if not db:
            return []
            
        if not user_id:
            user_id = get_user_id()
            
        # Use where() method with proper error handling for index issues
        results_list = []
        
        try:
            if analysis_type:
                # Query with both user_id and analysis_type
                results_docs = db.collection("analysis_results").where("user_id", "==", user_id).where("analysis_type", "==", analysis_type).order_by("created_at", direction=firestore.Query.DESCENDING).stream()
            else:
                # Query with just user_id
                results_docs = db.collection("analysis_results").where("user_id", "==", user_id).order_by("created_at", direction=firestore.Query.DESCENDING).stream()
            
            # Process the results
            for doc in results_docs:
                data = doc.to_dict()
                data["id"] = doc.id
                results_list.append(data)
                
        except Exception as index_error:
            # Fallback: try without ordering if index is missing
            st.warning("Index not found, retrieving results without ordering. Some features may be limited.")
            try:
                if analysis_type:
                    results_docs = db.collection("analysis_results").where("user_id", "==", user_id).where("analysis_type", "==", analysis_type).stream()
                else:
                    results_docs = db.collection("analysis_results").where("user_id", "==", user_id).stream()
                
                # Process the fallback results
                for doc in results_docs:
                    data = doc.to_dict()
                    data["id"] = doc.id
                    results_list.append(data)
            except Exception as fallback_error:
                st.error(f"Failed to retrieve analysis results: {fallback_error}")
                return []
            
        return results_list
    except Exception as e:
        st.error(f"Failed to retrieve analysis results: {e}")
        return []

def get_latest_analysis_result(user_id: Optional[str] = None, analysis_type: str = None) -> Optional[Dict]:
    """Get the most recent analysis result for a user"""
    try:
        results = get_user_analysis_results(user_id, analysis_type)
        return results[0] if results else None
    except Exception as e:
        st.error(f"Failed to get latest analysis result: {e}")
        return None

# User Preferences and Settings
def store_user_preferences(preferences: Dict) -> bool:
    """Store user preferences and settings"""
    try:
        db = init_firestore()
        if not db:
            return False
            
        user_id = get_user_id()
        user_email = get_user_email()
        
        preferences_data = {
            "user_id": user_id,
            "user_email": user_email,
            "preferences": preferences,
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        
        # Use user_id as document ID for easy updates
        db.collection("user_preferences").document(user_id).set(preferences_data, merge=True)
        return True
    except Exception as e:
        st.error(f"Failed to store user preferences: {e}")
        return False

def get_user_preferences(user_id: Optional[str] = None) -> Dict:
    """Retrieve user preferences"""
    try:
        db = init_firestore()
        if not db:
            return {}
            
        if not user_id:
            user_id = get_user_id()
            
        doc_ref = db.collection("user_preferences").document(user_id)
        doc = doc_ref.get()
        
        if doc.exists:
            data = doc.to_dict()
            return data.get("preferences", {})
        return {}
    except Exception as e:
        st.error(f"Failed to retrieve user preferences: {e}")
        return {}

def update_user_preference(key: str, value: Any) -> bool:
    """Update a specific user preference"""
    try:
        current_prefs = get_user_preferences()
        current_prefs[key] = value
        return store_user_preferences(current_prefs)
    except Exception as e:
        st.error(f"Failed to update user preference: {e}")
        return False

# Real-time Collaboration
def create_collaboration_session(session_name: str, session_type: str, data: Dict = None) -> str:
    """Create a new collaboration session"""
    try:
        db = init_firestore()
        if not db:
            return None
            
        user_id = get_user_id()
        user_email = get_user_email()
        
        session_data = {
            "session_name": session_name,
            "session_type": session_type,  # "contract_review", "billing_analysis", "crm_review"
            "created_by": user_id,
            "created_by_email": user_email,
            "participants": [user_id],
            "data": data or {},
            "status": "active",
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        
        doc_ref = db.collection("collaboration_sessions").add(session_data)
        return doc_ref[1].id
    except Exception as e:
        st.error(f"Failed to create collaboration session: {e}")
        return None

def join_collaboration_session(session_id: str) -> bool:
    """Join an existing collaboration session"""
    try:
        db = init_firestore()
        if not db:
            return False
            
        user_id = get_user_id()
        
        session_ref = db.collection("collaboration_sessions").document(session_id)
        session = session_ref.get()
        
        if not session.exists:
            st.error("Session not found")
            return False
            
        session_data = session.to_dict()
        participants = session_data.get("participants", [])
        
        if user_id not in participants:
            participants.append(user_id)
            session_ref.update({
                "participants": participants,
                "updated_at": firestore.SERVER_TIMESTAMP
            })
            
        return True
    except Exception as e:
        st.error(f"Failed to join collaboration session: {e}")
        return False

def get_user_collaboration_sessions(user_id: Optional[str] = None) -> List[Dict]:
    """Get collaboration sessions for a user"""
    try:
        db = init_firestore()
        if not db:
            return []
            
        if not user_id:
            user_id = get_user_id()
            
        # Get sessions where user is a participant
        sessions_list = []
        
        try:
            sessions_docs = db.collection("collaboration_sessions").where("participants", "array_contains", user_id).order_by("updated_at", direction=firestore.Query.DESCENDING).stream()
            
            # Process the results
            for doc in sessions_docs:
                data = doc.to_dict()
                data["id"] = doc.id
                sessions_list.append(data)
                
        except Exception as index_error:
            # Fallback: try without ordering if index is missing
            st.warning("Collaboration sessions index not found, retrieving results without ordering.")
            try:
                sessions_docs = db.collection("collaboration_sessions").where("participants", "array_contains", user_id).stream()
                
                # Process the fallback results
                for doc in sessions_docs:
                    data = doc.to_dict()
                    data["id"] = doc.id
                    sessions_list.append(data)
            except Exception as fallback_error:
                st.error(f"Failed to retrieve collaboration sessions: {fallback_error}")
                return []
            
        return sessions_list
    except Exception as e:
        st.error(f"Failed to retrieve collaboration sessions: {e}")
        return []

def update_collaboration_session_data(session_id: str, data: Dict) -> bool:
    """Update data in a collaboration session"""
    try:
        db = init_firestore()
        if not db:
            return False
            
        session_ref = db.collection("collaboration_sessions").document(session_id)
        session_ref.update({
            "data": data,
            "updated_at": firestore.SERVER_TIMESTAMP
        })
        return True
    except Exception as e:
        st.error(f"Failed to update collaboration session: {e}")
        return False

def add_collaboration_comment(session_id: str, comment: str, section: str = "general") -> bool:
    """Add a comment to a collaboration session"""
    try:
        db = init_firestore()
        if not db:
            return False
            
        user_id = get_user_id()
        user_email = get_user_email()
        
        comment_data = {
            "session_id": session_id,
            "user_id": user_id,
            "user_email": user_email,
            "comment": comment,
            "section": section,
            "timestamp": datetime.now().isoformat(),
            "created_at": firestore.SERVER_TIMESTAMP
        }
        
        db.collection("collaboration_comments").add(comment_data)
        return True
    except Exception as e:
        st.error(f"Failed to add collaboration comment: {e}")
        return False

def get_collaboration_comments(session_id: str) -> List[Dict]:
    """Get comments for a collaboration session"""
    try:
        db = init_firestore()
        if not db:
            return []
            
        comments_list = []
        
        try:
            comments_docs = db.collection("collaboration_comments").where("session_id", "==", session_id).order_by("created_at", direction=firestore.Query.ASCENDING).stream()
            
            # Process the results
            for doc in comments_docs:
                data = doc.to_dict()
                data["id"] = doc.id
                comments_list.append(data)
                
        except Exception as index_error:
            # Fallback: try without ordering if index is missing
            st.warning("Collaboration comments index not found, retrieving results without ordering.")
            try:
                comments_docs = db.collection("collaboration_comments").where("session_id", "==", session_id).stream()
                
                # Process the fallback results
                for doc in comments_docs:
                    data = doc.to_dict()
                    data["id"] = doc.id
                    comments_list.append(data)
            except Exception as fallback_error:
                st.error(f"Failed to retrieve collaboration comments: {fallback_error}")
                return []
            
        return comments_list
    except Exception as e:
        st.error(f"Failed to retrieve collaboration comments: {e}")
        return []

# Utility functions for data migration
def migrate_csv_feedback_to_firestore():
    """Migrate existing CSV feedback to Firestore"""
    try:
        import os
        import csv
        
        feedback_dir = "feedback"
        if not os.path.exists(feedback_dir):
            return
            
        for filename in os.listdir(feedback_dir):
            if filename.startswith("feedback_") and filename.endswith(".csv"):
                email = filename.replace("feedback_", "").replace(".csv", "")
                filepath = os.path.join(feedback_dir, filename)
                
                with open(filepath, 'r', newline='', encoding='utf-8') as csvfile:
                    reader = csv.DictReader(csvfile)
                    for row in reader:
                        store_feedback(
                            section=row.get('Section', ''),
                            mode='Manual',
                            issue=row.get('Issue', ''),
                            severity=row.get('Severity', ''),
                            feedback=row.get('Feedback', '')
                        )
                        
        st.success("CSV feedback migration completed!")
    except Exception as e:
        st.error(f"Failed to migrate CSV feedback: {e}")

# Session state integration
def sync_session_state_to_firestore():
    """Sync current session state analysis results to Firestore"""
    try:
        # Store contract analysis results
        if st.session_state.get("contract_findings"):
            store_analysis_results(
                "contract",
                st.session_state["contract_findings"],
                {"analyzed": st.session_state.get("contract_analyzed", False)}
            )
            
        # Store billing analysis results
        if st.session_state.get("billing_findings"):
            store_analysis_results(
                "billing",
                st.session_state["billing_findings"],
                {"analyzed": st.session_state.get("billing_analyzed", False)}
            )
            
        # Store CRM analysis results
        if st.session_state.get("crm_findings"):
            store_analysis_results(
                "crm",
                st.session_state["crm_findings"],
                {"analyzed": st.session_state.get("crm_analyzed", False)}
            )
            
        return True
    except Exception as e:
        st.error(f"Failed to sync session state: {e}")
        return False

def load_firestore_data_to_session():
    """Load latest Firestore data into session state"""
    try:
        # Load latest analysis results
        contract_result = get_latest_analysis_result(analysis_type="contract")
        if contract_result:
            st.session_state["contract_findings"] = contract_result.get("results", [])
            st.session_state["contract_analyzed"] = contract_result.get("metadata", {}).get("analyzed", False)
            
        billing_result = get_latest_analysis_result(analysis_type="billing")
        if billing_result:
            st.session_state["billing_findings"] = billing_result.get("results", [])
            st.session_state["billing_analyzed"] = billing_result.get("metadata", {}).get("analyzed", False)
            
        crm_result = get_latest_analysis_result(analysis_type="crm")
        if crm_result:
            st.session_state["crm_findings"] = crm_result.get("results", [])
            st.session_state["crm_analyzed"] = crm_result.get("metadata", {}).get("analyzed", False)
            
        # Load user preferences
        preferences = get_user_preferences()
        for key, value in preferences.items():
            if key in st.session_state:
                st.session_state[key] = value
                
        return True
    except Exception as e:
        st.error(f"Failed to load Firestore data: {e}")
        return False 

def store_user_file(file_info: Dict) -> str:
    """Store user file information in Firestore"""
    try:
        db = init_firestore()
        if not db:
            return None
            
        user_id = get_user_id()
        user_email = get_user_email()
        
        file_data = {
            "user_id": user_id,
            "user_email": user_email,
            "filename": file_info.get("filename"),
            "file_type": file_info.get("file_type"),
            "analysis_type": file_info.get("analysis_type"),
            "file_size": file_info.get("file_size"),
            "uploaded_at": firestore.SERVER_TIMESTAMP,
            "file_path": file_info.get("file_path")
        }
        
        doc_ref = db.collection("user_files").add(file_data)
        return doc_ref[1].id
    except Exception as e:
        st.error(f"Failed to store file information: {e}")
        return None

def get_user_files(user_id: Optional[str] = None) -> List[Dict]:
    """Retrieve user's uploaded files"""
    try:
        db = init_firestore()
        if not db:
            return []
            
        if not user_id:
            user_id = get_user_id()
            
        files_list = []
        
        try:
            files_docs = db.collection("user_files").where("user_id", "==", user_id).order_by("uploaded_at", direction=firestore.Query.DESCENDING).stream()
            
            # Process the results
            for doc in files_docs:
                data = doc.to_dict()
                data["id"] = doc.id
                files_list.append(data)
                
        except Exception as index_error:
            # Fallback: try without ordering if index is missing
            st.warning("Files index not found, retrieving results without ordering.")
            try:
                files_docs = db.collection("user_files").where("user_id", "==", user_id).stream()
                
                # Process the fallback results
                for doc in files_docs:
                    data = doc.to_dict()
                    data["id"] = doc.id
                    files_list.append(data)
            except Exception as fallback_error:
                st.error(f"Failed to retrieve user files: {fallback_error}")
                return []
        
        return files_list
    except Exception as e:
        st.error(f"Failed to retrieve user files: {e}")
        return []

def store_generated_report(report_info: Dict) -> str:
    """Store generated report information in Firestore"""
    try:
        db = init_firestore()
        if not db:
            return None
            
        user_id = get_user_id()
        user_email = get_user_email()
        
        report_data = {
            "user_id": user_id,
            "user_email": user_email,
            "report_name": report_info.get("report_name"),
            "report_format": report_info.get("report_format"),
            "report_content": report_info.get("report_content"),
            "client_name": report_info.get("client_name"),
            "total_issues": report_info.get("total_issues"),
            "generated_at": firestore.SERVER_TIMESTAMP,
            "file_name": report_info.get("file_name")
        }
        
        doc_ref = db.collection("user_reports").add(report_data)
        return doc_ref[1].id
    except Exception as e:
        st.error(f"Failed to store report information: {e}")
        return None

def get_user_reports(user_id: Optional[str] = None) -> List[Dict]:
    """Retrieve user's generated reports"""
    try:
        db = init_firestore()
        if not db:
            return []
            
        if not user_id:
            user_id = get_user_id()
            
        reports_list = []
        
        try:
            reports_docs = db.collection("user_reports").where("user_id", "==", user_id).order_by("generated_at", direction=firestore.Query.DESCENDING).stream()
            
            # Process the results
            for doc in reports_docs:
                data = doc.to_dict()
                data["id"] = doc.id
                reports_list.append(data)
                
        except Exception as index_error:
            # Fallback: try without ordering if index is missing
            st.warning("Reports index not found, retrieving results without ordering.")
            try:
                reports_docs = db.collection("user_reports").where("user_id", "==", user_id).stream()
                
                # Process the fallback results
                for doc in reports_docs:
                    data = doc.to_dict()
                    data["id"] = doc.id
                    reports_list.append(data)
            except Exception as fallback_error:
                st.error(f"Failed to retrieve user reports: {fallback_error}")
                return []
        
        return reports_list
    except Exception as e:
        st.error(f"Failed to retrieve user reports: {e}")
        return []

def get_report_by_id(report_id: str) -> Optional[Dict]:
    """Retrieve a specific report by ID"""
    try:
        db = init_firestore()
        if not db:
            return None
            
        doc_ref = db.collection("user_reports").document(report_id)
        doc = doc_ref.get()
        
        if doc.exists:
            data = doc.to_dict()
            data["id"] = doc.id
            return data
        return None
    except Exception as e:
        st.error(f"Failed to retrieve report: {e}")
        return None

# Integration Token Management Functions
def store_integration_token(user_id: str, platform: str, token_info: Dict) -> bool:
    """Store OAuth token for a specific integration platform"""
    try:
        db = init_firestore()
        if not db:
            return False
            
        # Store token in users/{uid}/integrations/{platform}
        token_data = {
            "user_id": user_id,
            "platform": platform,
            "access_token": token_info.get("access_token"),
            "refresh_token": token_info.get("refresh_token"),
            "expires_in": token_info.get("expires_in"),
            "token_type": token_info.get("token_type"),
            "expires_at": token_info.get("expires_at"),
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        
        # Use user_id and platform as document ID for easy retrieval
        doc_id = f"{user_id}_{platform}"
        db.collection("integration_tokens").document(doc_id).set(token_data)
        
        return True
    except Exception as e:
        st.error(f"Failed to store integration token: {e}")
        return False

def get_integration_token(user_id: str, platform: str) -> Optional[Dict]:
    """Retrieve OAuth token for a specific integration platform"""
    try:
        db = init_firestore()
        if not db:
            return None
            
        # Retrieve token using user_id and platform as document ID
        doc_id = f"{user_id}_{platform}"
        doc_ref = db.collection("integration_tokens").document(doc_id)
        doc = doc_ref.get()
        
        if doc.exists:
            return doc.to_dict()
        return None
    except Exception as e:
        st.error(f"Failed to retrieve integration token: {e}")
        return None

def delete_integration_token(user_id: str, platform: str) -> bool:
    """Delete OAuth token for a specific integration platform"""
    try:
        db = init_firestore()
        if not db:
            return False
            
        # Delete token using user_id and platform as document ID
        doc_id = f"{user_id}_{platform}"
        db.collection("integration_tokens").document(doc_id).delete()
        
        return True
    except Exception as e:
        st.error(f"Failed to delete integration token: {e}")
        return False

def get_user_integrations(user_id: str) -> List[Dict]:
    """Get all integrations for a user"""
    try:
        db = init_firestore()
        if not db:
            return []
            
        integrations_list = []
        
        try:
            # Query for all tokens belonging to this user
            tokens_docs = db.collection("integration_tokens").where("user_id", "==", user_id).stream()
            
            for doc in tokens_docs:
                data = doc.to_dict()
                data["id"] = doc.id
                integrations_list.append(data)
                
        except Exception as e:
            st.error(f"Failed to retrieve user integrations: {e}")
            return []
        
        return integrations_list
    except Exception as e:
        st.error(f"Failed to retrieve user integrations: {e}")
        return []

def update_integration_token(user_id: str, platform: str, token_info: Dict) -> bool:
    """Update existing OAuth token for a specific integration platform"""
    try:
        db = init_firestore()
        if not db:
            return False
            
        # Update token using user_id and platform as document ID
        doc_id = f"{user_id}_{platform}"
        
        update_data = {
            "access_token": token_info.get("access_token"),
            "refresh_token": token_info.get("refresh_token"),
            "expires_in": token_info.get("expires_in"),
            "token_type": token_info.get("token_type"),
            "expires_at": token_info.get("expires_at"),
            "updated_at": firestore.SERVER_TIMESTAMP
        }
        
        db.collection("integration_tokens").document(doc_id).update(update_data)
        
        return True
    except Exception as e:
        st.error(f"Failed to update integration token: {e}")
        return False 

def store_sync_log(user_id: str, sync_log: Dict) -> bool:
    """Store sync log in Firestore"""
    try:
        db = init_firestore()
        if not db:
            return False
        
        sync_log_data = {
            "user_id": user_id,
            "platform": sync_log.get("platform"),
            "sync_name": sync_log.get("sync_name"),
            "start_time": sync_log.get("start_time"),
            "end_time": sync_log.get("end_time"),
            "duration_seconds": sync_log.get("duration_seconds", 0),
            "success": sync_log.get("success", False),
            "records_count": sync_log.get("records_count", 0),
            "error": sync_log.get("error"),
            "created_at": firestore.SERVER_TIMESTAMP
        }
        
        db.collection("sync_logs").add(sync_log_data)
        return True
    except Exception as e:
        st.error(f"Failed to store sync log: {e}")
        return False

def get_sync_logs(user_id: str, limit: int = 50, start_date: str = None) -> List[Dict]:
    """Get sync logs for a user"""
    try:
        db = init_firestore()
        if not db:
            return []
        
        query = db.collection("sync_logs").where("user_id", "==", user_id)
        
        if start_date:
            query = query.where("start_time", ">=", start_date)
        
        query = query.order_by("start_time", direction=firestore.Query.DESCENDING).limit(limit)
        
        logs = []
        for doc in query.stream():
            log_data = doc.to_dict()
            log_data["id"] = doc.id
            logs.append(log_data)
        
        return logs
    except Exception as e:
        st.error(f"Failed to retrieve sync logs: {e}")
        return []

def get_all_users_with_integrations() -> List[str]:
    """Get all user IDs that have at least one integration connected"""
    try:
        db = init_firestore()
        if not db:
            return []
        
        # Get unique user IDs from integration tokens
        tokens_docs = db.collection("integration_tokens").stream()
        user_ids = set()
        
        for doc in tokens_docs:
            data = doc.to_dict()
            if data.get("user_id"):
                user_ids.add(data["user_id"])
        
        return list(user_ids)
    except Exception as e:
        st.error(f"Failed to get users with integrations: {e}")
        return []

def store_synced_data(user_id: str, platform: str, sync_data: Dict) -> bool:
    """Store synced data in Firestore"""
    try:
        db = init_firestore()
        if not db:
            return False
        
        # Store with timestamp as document ID for versioning
        timestamp = datetime.now().isoformat()
        doc_id = f"{user_id}_{platform}_{timestamp}"
        
        sync_data["user_id"] = user_id
        sync_data["platform"] = platform
        sync_data["created_at"] = firestore.SERVER_TIMESTAMP
        
        db.collection("synced_data").document(doc_id).set(sync_data)
        return True
    except Exception as e:
        st.error(f"Failed to store synced data: {e}")
        return False

def get_latest_synced_data(user_id: str, platform: str) -> Optional[Dict]:
    """Get the latest synced data for a user and platform"""
    try:
        db = init_firestore()
        if not db:
            return None
        
        # Query for the most recent synced data
        query = (db.collection("synced_data")
                .where("user_id", "==", user_id)
                .where("platform", "==", platform)
                .order_by("created_at", direction=firestore.Query.DESCENDING)
                .limit(1))
        
        docs = list(query.stream())
        if docs:
            data = docs[0].to_dict()
            data["id"] = docs[0].id
            return data
        
        return None
    except Exception as e:
        st.error(f"Failed to get latest synced data: {e}")
        return None

def store_sync_summary(user_id: str, summary: Dict) -> bool:
    """Store daily sync summary"""
    try:
        db = init_firestore()
        if not db:
            return False
        
        summary_data = {
            "user_id": user_id,
            "date": summary.get("date"),
            "total_syncs": summary.get("total_syncs", 0),
            "successful_syncs": summary.get("successful_syncs", 0),
            "failed_syncs": summary.get("failed_syncs", 0),
            "total_records": summary.get("total_records", 0),
            "platforms_synced": summary.get("platforms_synced", []),
            "created_at": firestore.SERVER_TIMESTAMP
        }
        
        # Use date as document ID for easy retrieval
        doc_id = f"{user_id}_{summary.get('date')}"
        db.collection("sync_summaries").document(doc_id).set(summary_data)
        
        return True
    except Exception as e:
        st.error(f"Failed to store sync summary: {e}")
        return False

def get_sync_summaries(user_id: str, days: int = 7) -> List[Dict]:
    """Get sync summaries for a user for the last N days"""
    try:
        db = init_firestore()
        if not db:
            return []
        
        # Calculate start date
        start_date = (datetime.now() - timedelta(days=days)).date().isoformat()
        
        query = (db.collection("sync_summaries")
                .where("user_id", "==", user_id)
                .where("date", ">=", start_date)
                .order_by("date", direction=firestore.Query.DESCENDING))
        
        summaries = []
        for doc in query.stream():
            summary_data = doc.to_dict()
            summary_data["id"] = doc.id
            summaries.append(summary_data)
        
        return summaries
    except Exception as e:
        st.error(f"Failed to get sync summaries: {e}")
        return []

# --- Alert Management Functions ---

def store_alert(user_id: str, alert_data: Dict) -> bool:
    """Store an alert in Firestore"""
    try:
        db = init_firestore()
        if not db:
            return False
        
        # Add metadata
        alert_data['user_id'] = user_id
        alert_data['created_at'] = firestore.SERVER_TIMESTAMP
        alert_data['resolved'] = False
        
        # Store in alerts collection
        db.collection('alerts').add(alert_data)
        
        return True
        
    except Exception as e:
        st.error(f"Failed to store alert: {e}")
        return False

def get_user_alerts(user_id: str, include_resolved: bool = False, limit: int = 50) -> List[Dict]:
    """Get alerts for a user"""
    try:
        db = init_firestore()
        if not db:
            return []
        
        # Query alerts
        query = db.collection('alerts').where('user_id', '==', user_id)
        
        if not include_resolved:
            query = query.where('resolved', '==', False)
        
        query = query.order_by('created_at', direction=firestore.Query.DESCENDING).limit(limit)
        docs = query.stream()
        
        alerts = []
        for doc in docs:
            alert = doc.to_dict()
            alert['id'] = doc.id
            alerts.append(alert)
        
        return alerts
        
    except Exception as e:
        st.error(f"Failed to get alerts: {e}")
        return []

def resolve_alert(alert_id: str, user_id: str) -> bool:
    """Mark an alert as resolved"""
    try:
        db = init_firestore()
        if not db:
            return False
        
        # Update alert
        alert_ref = db.collection('alerts').document(alert_id)
        alert_ref.update({
            'resolved': True,
            'resolved_at': firestore.SERVER_TIMESTAMP
        })
        
        return True
        
    except Exception as e:
        st.error(f"Failed to resolve alert: {e}")
        return False

# --- Report Management Functions ---

def store_report(user_id: str, report_data: Dict) -> bool:
    """Store a report in Firestore"""
    try:
        db = init_firestore()
        if not db:
            return False
        
        # Add metadata
        report_data['user_id'] = user_id
        report_data['created_at'] = firestore.SERVER_TIMESTAMP
        
        # Store in reports collection
        db.collection('reports').add(report_data)
        
        return True
        
    except Exception as e:
        st.error(f"Failed to store report: {e}")
        return False 