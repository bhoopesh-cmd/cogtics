import streamlit as st
from firestore_service import store_feedback, get_user_feedback, get_all_feedback

def log_feedback(section, mode, issue, severity, feedback):
    """Store feedback in Firestore instead of CSV"""
    success = store_feedback(section, mode, issue, severity, feedback)
    if success:
        st.success("Feedback stored successfully!")
    else:
        st.error("Failed to store feedback. Please try again.")

def get_feedback_for_display(user_id=None):
    """Get feedback for display in the UI"""
    if user_id:
        return get_user_feedback(user_id)
    else:
        return get_user_feedback()

def get_all_feedback_for_admin():
    """Get all feedback for admin purposes"""
    return get_all_feedback() 