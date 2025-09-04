# --- Imports ---
import streamlit as st
from dashboard import show_dashboard_tab
from auth import (
    login_user, signup_user, logout_user, is_logged_in, get_user_email,
    get_user_full_name, get_user_phone_number, get_user_company_name, get_user_profile
)
from feedback import log_feedback, get_feedback_for_display
from contract import show_contract_tab
from billing import show_billing_tab
from crm import show_crm_tab
from integrations import show_integrations_tab
from utils import init_session_state
from firestore_service import (
    sync_session_state_to_firestore, 
    create_collaboration_session, 
    get_user_collaboration_sessions,
    join_collaboration_session,
    add_collaboration_comment,
    get_collaboration_comments,
    update_collaboration_session_data,
    store_user_preferences,
    get_user_preferences,
    update_user_preference,
    get_user_files,
    get_user_reports,
    get_report_by_id
)

# --- Session State Initialization ---
init_session_state()

# --- Firebase Auth UI ---
if not is_logged_in():
    st.title("RLDA Login")
    
    # Toggle between login and signup
    auth_mode = st.radio("Choose Action", ["Login", "Sign Up"], horizontal=True)
    
    if auth_mode == "Login":
        # Login form
        with st.form("login_form"):
            email = st.text_input("Email", key="login_email")
            password = st.text_input("Password", type="password", key="login_password")
            
            login_button = st.form_submit_button("🔐 Login", use_container_width=True)
            
            if login_button:
                if not email or not password:
                    st.error("Please enter both email and password.")
                else:
                    result = login_user(email, password)
                    if isinstance(result, dict):
                        st.success("Login successful!")
                        st.rerun()
                    else:
                        st.error(result)
    
    else:
        # Signup form with additional fields
        with st.form("signup_form"):
            st.subheader("Create New Account")
            
            col1, col2 = st.columns(2)
            with col1:
                full_name = st.text_input("Full Name", key="signup_full_name")
                email = st.text_input("Email", key="signup_email")
                password = st.text_input("Password", type="password", key="signup_password")
            
            with col2:
                company_name = st.text_input("Company Name", key="signup_company")
                phone_number = st.text_input("Phone Number", key="signup_phone")
                confirm_password = st.text_input("Confirm Password", type="password", key="signup_confirm_password")
            
            signup_button = st.form_submit_button("🆕 Create Account", use_container_width=True)
            
            if signup_button:
                # Validation
                if not all([email, password, full_name, company_name]):
                    st.error("Please fill in all required fields (Email, Password, Full Name, Company Name).")
                elif password != confirm_password:
                    st.error("Passwords do not match.")
                elif len(password) < 6:
                    st.error("Password must be at least 6 characters long.")
                else:
                    result = signup_user(email, password, full_name, phone_number, company_name)
                    if isinstance(result, dict):
                        st.success("Account created successfully! You are now logged in.")
                        st.rerun()
                    else:
                        st.error(result)
    
    st.stop()
else:
    user_profile = get_user_profile()
    user_email = get_user_email()
    
    # Display user information in sidebar
    st.sidebar.success(f"Welcome, {user_profile.get('full_name', user_email) if user_profile else user_email}")
    
    if user_profile and user_profile.get('company_name'):
        st.sidebar.info(f"🏢 {user_profile['company_name']}")
    
    # Sync session state to Firestore when user logs in
    if st.sidebar.button("💾 Save to Cloud"):
        if sync_session_state_to_firestore():
            st.sidebar.success("Data saved to cloud!")
        else:
            st.sidebar.error("Failed to save data")
    
    if st.sidebar.button("🚪 Log Out"):
        logout_user()

# --- UI Tabs ---
tabs = st.tabs(["Dashboard", "Contract", "Billing", "CRM", "Integrations", "Files & Reports", "Feedback", "Settings"])

with tabs[0]:
    show_dashboard_tab()
with tabs[1]:
    show_contract_tab()
with tabs[2]:
    show_billing_tab()
with tabs[3]:
    show_crm_tab()
with tabs[4]:
    show_integrations_tab()
with tabs[5]:
    st.header("📁 Files & Reports")
    
    # User Files Section
    st.subheader("📄 Uploaded Files")
    with st.spinner("Loading your uploaded files..."):
        user_files = get_user_files()
    
    if user_files:
        for file in user_files:
            with st.expander(f"📄 {file.get('filename', 'Unknown File')}"):
                col1, col2 = st.columns(2)
                with col1:
                    st.write(f"**Type:** {file.get('analysis_type', 'Unknown').title()}")
                    st.write(f"**Size:** {file.get('file_size', 0)} bytes")
                    st.write(f"**Uploaded:** {file.get('uploaded_at', 'Unknown')}")
                with col2:
                    st.write(f"**File Type:** {file.get('file_type', 'Unknown')}")
                    if st.button(f"🗑️ Delete", key=f"delete_file_{file['id']}"):
                        st.warning("File deletion not implemented yet.")
    else:
        st.info("No uploaded files found.")
    
    # User Reports Section
    st.subheader("📊 Generated Reports")
    with st.spinner("Loading your generated reports..."):
        user_reports = get_user_reports()
    
    if user_reports:
        for report in user_reports:
            with st.expander(f"📊 {report.get('report_name', 'Unknown Report')}"):
                col1, col2 = st.columns(2)
                with col1:
                    st.write(f"**Format:** {report.get('report_format', 'Unknown')}")
                    st.write(f"**Client:** {report.get('client_name', 'Unknown')}")
                    st.write(f"**Issues:** {report.get('total_issues', 0)}")
                    st.write(f"**Generated:** {report.get('generated_at', 'Unknown')}")
                
                with col2:
                    # Re-download buttons
                    if report.get('report_format') == 'HTML':
                        st.download_button(
                            label="📥 Download HTML",
                            data=report.get('report_content', ''),
                            file_name=report.get('file_name', 'report.html'),
                            mime="text/html"
                        )
                    elif report.get('report_format') == 'Markdown':
                        st.download_button(
                            label="📥 Download Markdown",
                            data=report.get('report_content', ''),
                            file_name=report.get('file_name', 'report.md'),
                            mime="text/markdown"
                        )
                    elif report.get('report_format') == 'PDF':
                        st.download_button(
                            label="📥 Download PDF",
                            data=report.get('report_content', ''),
                            file_name=report.get('file_name', 'report.pdf'),
                            mime="application/pdf"
                        )
                    
                    if st.button(f"🗑️ Delete", key=f"delete_report_{report['id']}"):
                        st.warning("Report deletion not implemented yet.")
    else:
        st.info("No generated reports found.")
        
with tabs[6]:
    st.header("Feedback")
    # Feedback form
    with st.form("feedback_form"):
        section = st.selectbox("Section", ["Contract", "Billing", "CRM"])
        issue = st.text_input("Issue")
        severity = st.selectbox("Severity", ["High", "Medium", "Low"])
        comments = st.text_area("Comments")
        submitted = st.form_submit_button("Submit Feedback")
        if submitted:
            log_feedback(section, "Manual", issue, severity, comments)
    
    # Show previous feedback from Firestore
    st.subheader("Your Previous Feedback")
    feedback_data = get_feedback_for_display()
    if feedback_data:
        # Convert to DataFrame for display
        import pandas as pd
        df_data = []
        for feedback in feedback_data:
            df_data.append({
                "Timestamp": feedback.get("timestamp", ""),
                "Section": feedback.get("section", ""),
                "Issue": feedback.get("issue", ""),
                "Severity": feedback.get("severity", ""),
                "Feedback": feedback.get("feedback", "")
            })
        if df_data:
            df = pd.DataFrame(df_data)
            st.dataframe(df, use_container_width=True)
        else:
            st.info("No feedback records yet.")
    else:
        st.info("No feedback records yet.")

with tabs[7]:
    st.header("⚙️ Settings & Preferences")
    
    # Create tabs within Settings
    settings_tabs = st.tabs(["General Settings", "Data Sync Scheduler", "Collaboration", "Alerts & Reports"])
    
    # General Settings Tab
    with settings_tabs[0]:
        st.subheader("General Settings")
        
        # User preferences
        current_prefs = get_user_preferences()
        
        with st.form("preferences_form"):
            st.subheader("Analysis Preferences")
            contract_mode = st.selectbox("Contract Analysis Mode", ["Rule-Based", "AI-Powered"], 
                                       index=0 if current_prefs.get("contract_mode") == "Rule-Based" else 1)
            billing_mode = st.selectbox("Billing Analysis Mode", ["Rule-Based", "AI-Powered"],
                                      index=0 if current_prefs.get("billing_mode") == "Rule-Based" else 1)
            crm_mode = st.selectbox("CRM Analysis Mode", ["Rule-Based", "AI-Powered"],
                                  index=0 if current_prefs.get("crm_mode") == "Rule-Based" else 1)
            
            st.subheader("Display Preferences")
            auto_save = st.checkbox("Auto-save to cloud", value=current_prefs.get("auto_save", True))
            show_timestamps = st.checkbox("Show timestamps", value=current_prefs.get("show_timestamps", True))
            theme = st.selectbox("Theme", ["Light", "Dark"], index=0 if current_prefs.get("theme") == "Light" else 1)
            
            if st.form_submit_button("Save Preferences"):
                preferences = {
                    "contract_mode": contract_mode,
                    "billing_mode": billing_mode,
                    "crm_mode": crm_mode,
                    "auto_save": auto_save,
                    "show_timestamps": show_timestamps,
                    "theme": theme
                }
                
                if store_user_preferences(preferences):
                    st.success("Preferences saved!")
                else:
                    st.error("Failed to save preferences")
        
        # Data migration
        with st.expander("Data Migration"):
            st.write("Migrate existing CSV feedback to Firestore")
            if st.button("Migrate CSV Feedback"):
                from firestore_service import migrate_csv_feedback_to_firestore
                migrate_csv_feedback_to_firestore()
    
    # Data Sync Scheduler Tab
    with settings_tabs[1]:
        from scheduler import show_scheduler_settings
        show_scheduler_settings()
    
    # Collaboration Tab
    with settings_tabs[2]:
        st.subheader("🤝 Collaboration")
        
        # Create new collaboration session
        with st.expander("Create New Session"):
            with st.form("create_session"):
                session_name = st.text_input("Session Name")
                session_type = st.selectbox("Session Type", ["contract_review", "billing_analysis", "crm_review"])
                session_data = st.text_area("Initial Data (JSON)", value="{}")
                
                if st.form_submit_button("Create Session"):
                    try:
                        import json
                        data = json.loads(session_data) if session_data else {}
                        session_id = create_collaboration_session(session_name, session_type, data)
                        if session_id:
                            st.success(f"Session created! ID: {session_id}")
                        else:
                            st.error("Failed to create session")
                    except json.JSONDecodeError:
                        st.error("Invalid JSON format")
        
        # Join existing session
        with st.expander("Join Session"):
            session_id = st.text_input("Session ID")
            if st.button("Join Session"):
                if join_collaboration_session(session_id):
                    st.success("Joined session successfully!")
                else:
                    st.error("Failed to join session")
        
        # User's collaboration sessions
        st.subheader("Your Sessions")
        sessions = get_user_collaboration_sessions()
        if sessions:
            for session in sessions:
                with st.expander(f"{session.get('session_name', 'Unnamed')} - {session.get('session_type', 'Unknown')}"):
                    st.write(f"**Created by:** {session.get('created_by_email', 'Unknown')}")
                    st.write(f"**Status:** {session.get('status', 'Unknown')}")
                    st.write(f"**Participants:** {len(session.get('participants', []))}")
                    
                    # Session data
                    session_data = session.get('data', {})
                    if session_data:
                        st.json(session_data)
                    
                    # Comments
                    st.subheader("Comments")
                    comments = get_collaboration_comments(session['id'])
                    for comment in comments:
                        st.write(f"**{comment.get('user_email', 'Unknown')}:** {comment.get('comment', '')}")
                        st.caption(f"Section: {comment.get('section', 'general')} - {comment.get('timestamp', '')}")
                    
                    # Add comment
                    with st.form(f"comment_form_{session['id']}"):
                        new_comment = st.text_area("Add Comment")
                        comment_section = st.selectbox("Section", ["general", "contract", "billing", "crm"], key=f"section_{session['id']}")
                        if st.form_submit_button("Add Comment"):
                            if add_collaboration_comment(session['id'], new_comment, comment_section):
                                st.success("Comment added!")
                                st.rerun()
                            else:
                                st.error("Failed to add comment")
        else:
            st.info("No collaboration sessions yet.")
    
    # Alerts & Reports Tab
    with settings_tabs[3]:
        from alerts import show_alerts_tab
        show_alerts_tab()




