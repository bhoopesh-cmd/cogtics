"""
Data Sync Scheduler for RLDA
Handles automatic data synchronization for OAuth integrations
Schedules syncs every 6-12 hours based on user preferences
"""

import streamlit as st
import schedule
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import pandas as pd
import logging

# Import Firebase services and integration functions
from firestore_service import (
    get_integration_token, get_user_id, store_sync_log, get_sync_logs,
    get_user_preferences, update_user_preference, get_all_users_with_integrations
)
from integrations import (
    refresh_token_if_needed,
    fetch_hubspot_deals,
    fetch_quickbooks_invoices,
    fetch_google_drive_contracts,
    fetch_salesforce_opportunities,
    fetch_salesforce_contracts,
    is_integration_connected
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('sync_scheduler.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DataSyncScheduler:
    """Manages scheduled data synchronization for OAuth integrations"""
    
    def __init__(self):
        self.scheduler = schedule.Scheduler()
        self.sync_thread = None
        self.is_running = False
        self.sync_configs = {
            "hubspot": {
                "function": fetch_hubspot_deals,
                "name": "HubSpot Deals",
                "default_interval": 6  # hours
            },
            "quickbooks": {
                "function": fetch_quickbooks_invoices,
                "name": "QuickBooks Invoices",
                "default_interval": 6  # hours
            },
            "google_drive": {
                "function": fetch_google_drive_contracts,
                "name": "Google Drive Contracts",
                "default_interval": 12  # hours
            },
            "salesforce": {
                "function": fetch_salesforce_opportunities,
                "name": "Salesforce Opportunities",
                "default_interval": 6  # hours
            }
        }
    
    def start_scheduler(self):
        """Start the scheduler in a background thread"""
        if not self.is_running:
            self.is_running = True
            self.sync_thread = threading.Thread(target=self._run_scheduler, daemon=True)
            self.sync_thread.start()
            logger.info("Data sync scheduler started")
    
    def stop_scheduler(self):
        """Stop the scheduler"""
        self.is_running = False
        if self.sync_thread:
            self.sync_thread.join(timeout=5)
        logger.info("Data sync scheduler stopped")
    
    def _run_scheduler(self):
        """Run the scheduler loop"""
        while self.is_running:
            try:
                self.scheduler.run_pending()
                time.sleep(60)  # Check every minute
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")
                time.sleep(300)  # Wait 5 minutes on error
    
    def schedule_user_syncs(self, user_id: str):
        """Schedule syncs for a specific user"""
        try:
            # Get user preferences
            preferences = get_user_preferences(user_id)
            sync_enabled = preferences.get("sync_enabled", False)
            sync_interval = preferences.get("sync_interval", 6)  # default 6 hours
            
            if not sync_enabled:
                logger.info(f"Sync disabled for user {user_id}")
                return
            
            # Clear existing jobs for this user
            self._clear_user_jobs(user_id)
            
            # Schedule syncs for each connected integration
            for platform, config in self.sync_configs.items():
                if is_integration_connected(platform):
                    interval = preferences.get(f"{platform}_sync_interval", config["default_interval"])
                    
                    # Schedule the sync job
                    job = self.scheduler.every(interval).hours.do(
                        self._sync_platform_data, user_id, platform, config
                    ).tag(f"{user_id}_{platform}")
                    
                    logger.info(f"Scheduled {config['name']} sync for user {user_id} every {interval} hours")
            
            # Schedule a daily sync summary
            self.scheduler.every().day.at("09:00").do(
                self._generate_sync_summary, user_id
            ).tag(f"{user_id}_summary")
            
        except Exception as e:
            logger.error(f"Error scheduling syncs for user {user_id}: {e}")
    
    def _clear_user_jobs(self, user_id: str):
        """Clear all scheduled jobs for a specific user"""
        jobs_to_remove = []
        for job in self.scheduler.jobs:
            if job.tags and any(tag.startswith(user_id) for tag in job.tags):
                jobs_to_remove.append(job)
        
        for job in jobs_to_remove:
            self.scheduler.cancel_job(job)
    
    def _sync_platform_data(self, user_id: str, platform: str, config: Dict):
        """Execute data sync for a specific platform"""
        try:
            logger.info(f"Starting {config['name']} sync for user {user_id}")
            
            # Check if integration is still connected
            if not is_integration_connected(platform):
                logger.warning(f"{platform} integration not connected for user {user_id}")
                return
            
            # Refresh token if needed
            token = refresh_token_if_needed(platform)
            if not token:
                logger.error(f"Failed to refresh {platform} token for user {user_id}")
                return
            
            # Fetch data
            start_time = datetime.now()
            data = config["function"]()
            end_time = datetime.now()
            
            # Log sync results
            sync_log = {
                "user_id": user_id,
                "platform": platform,
                "sync_name": config["name"],
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration_seconds": (end_time - start_time).total_seconds(),
                "success": data is not None and not data.empty,
                "records_count": len(data) if data is not None and not data.empty else 0,
                "error": None
            }
            
            if data is not None and not data.empty:
                # Store the synced data in Firestore
                sync_data = {
                    "user_id": user_id,
                    "platform": platform,
                    "data": data.to_dict('records'),
                    "sync_timestamp": datetime.now().isoformat(),
                    "record_count": len(data)
                }
                store_synced_data(user_id, platform, sync_data)
                logger.info(f"Successfully synced {len(data)} {config['name']} records for user {user_id}")
            else:
                sync_log["error"] = "No data returned or empty dataset"
                logger.warning(f"No data synced for {config['name']} - user {user_id}")
            
            # Store sync log
            store_sync_log(user_id, sync_log)
            
        except Exception as e:
            logger.error(f"Error syncing {platform} data for user {user_id}: {e}")
            
            # Log error
            sync_log = {
                "user_id": user_id,
                "platform": platform,
                "sync_name": config["name"],
                "start_time": datetime.now().isoformat(),
                "end_time": datetime.now().isoformat(),
                "duration_seconds": 0,
                "success": False,
                "records_count": 0,
                "error": str(e)
            }
            store_sync_log(user_id, sync_log)
    

    
    def _generate_sync_summary(self, user_id: str):
        """Generate daily sync summary for user"""
        try:
            # Get sync logs for the last 24 hours
            yesterday = datetime.now() - timedelta(days=1)
            logs = get_sync_logs(user_id, start_date=yesterday.isoformat())
            
            if logs:
                summary = {
                    "user_id": user_id,
                    "date": datetime.now().date().isoformat(),
                    "total_syncs": len(logs),
                    "successful_syncs": len([log for log in logs if log.get("success", False)]),
                    "failed_syncs": len([log for log in logs if not log.get("success", False)]),
                    "total_records": sum(log.get("records_count", 0) for log in logs),
                    "platforms_synced": list(set(log.get("platform") for log in logs))
                }
                
                # Store summary
                store_sync_summary(user_id, summary)
                logger.info(f"Generated sync summary for user {user_id}: {summary}")
            
        except Exception as e:
            logger.error(f"Error generating sync summary for user {user_id}: {e}")
    
    def get_scheduler_status(self) -> Dict[str, Any]:
        """Get current scheduler status"""
        return {
            "is_running": self.is_running,
            "active_jobs": len(self.scheduler.jobs),
            "next_run": self._get_next_run_time()
        }
    
    def _get_next_run_time(self) -> Optional[str]:
        """Get the next scheduled run time"""
        if self.scheduler.jobs:
            next_job = min(self.scheduler.jobs, key=lambda x: x.next_run)
            return next_job.next_run.isoformat()
        return None

# Global scheduler instance
sync_scheduler = DataSyncScheduler()

def show_scheduler_settings():
    """Display scheduler settings in Streamlit UI"""
    st.subheader("🕐 Data Sync Scheduler")
    st.write("Configure automatic data synchronization for your connected integrations.")
    
    user_id = get_user_id()
    if not user_id:
        st.error("Please log in to configure sync settings.")
        return
    
    # Get current preferences
    preferences = get_user_preferences(user_id)
    
    # Sync Settings
    with st.expander("⚙️ Sync Configuration", expanded=True):
        col1, col2 = st.columns(2)
        
        with col1:
            sync_enabled = st.checkbox(
                "Enable Automatic Sync",
                value=preferences.get("sync_enabled", False),
                help="Automatically sync data from connected integrations"
            )
        
        with col2:
            sync_interval = st.selectbox(
                "Default Sync Interval",
                options=[6, 8, 12, 24],
                index=0 if preferences.get("sync_interval", 6) == 6 else 1,
                help="How often to sync data (hours)"
            )
        
        # Platform-specific settings
        st.write("**Platform-specific intervals:**")
        
        platform_intervals = {}
        for platform, config in sync_scheduler.sync_configs.items():
            if is_integration_connected(platform):
                current_interval = preferences.get(f"{platform}_sync_interval", config["default_interval"])
                interval = st.selectbox(
                    f"{config['name']} Sync Interval",
                    options=[6, 8, 12, 24],
                    index=[6, 8, 12, 24].index(current_interval),
                    key=f"interval_{platform}"
                )
                platform_intervals[platform] = interval
            else:
                st.info(f"⚠️ {config['name']} not connected - sync disabled")
        
        # Save settings
        if st.button("💾 Save Sync Settings", type="primary"):
            # Update preferences
            new_preferences = {
                "sync_enabled": sync_enabled,
                "sync_interval": sync_interval
            }
            
            # Add platform-specific intervals
            for platform, interval in platform_intervals.items():
                new_preferences[f"{platform}_sync_interval"] = interval
            
            # Save to Firestore
            for key, value in new_preferences.items():
                update_user_preference(user_id, key, value)
            
            # Reschedule syncs
            sync_scheduler.schedule_user_syncs(user_id)
            
            st.success("✅ Sync settings saved and scheduled!")
    
    # Sync Status
    with st.expander("📊 Sync Status", expanded=True):
        status = sync_scheduler.get_scheduler_status()
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("Scheduler Status", "🟢 Running" if status["is_running"] else "🔴 Stopped")
        
        with col2:
            st.metric("Active Jobs", status["active_jobs"])
        
        with col3:
            next_run = status["next_run"]
            if next_run:
                st.metric("Next Sync", datetime.fromisoformat(next_run).strftime("%H:%M"))
            else:
                st.metric("Next Sync", "None")
        
        # Manual sync buttons
        st.write("**Manual Sync:**")
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            if st.button("🔄 Sync HubSpot", key="manual_hubspot"):
                if is_integration_connected("hubspot"):
                    with st.spinner("Syncing HubSpot data..."):
                        sync_scheduler._sync_platform_data(user_id, "hubspot", sync_scheduler.sync_configs["hubspot"])
                    st.success("HubSpot sync completed!")
                else:
                    st.error("HubSpot not connected")
        
        with col2:
            if st.button("🔄 Sync QuickBooks", key="manual_quickbooks"):
                if is_integration_connected("quickbooks"):
                    with st.spinner("Syncing QuickBooks data..."):
                        sync_scheduler._sync_platform_data(user_id, "quickbooks", sync_scheduler.sync_configs["quickbooks"])
                    st.success("QuickBooks sync completed!")
                else:
                    st.error("QuickBooks not connected")
        
        with col3:
            if st.button("🔄 Sync Google Drive", key="manual_google"):
                if is_integration_connected("google_drive"):
                    with st.spinner("Syncing Google Drive data..."):
                        sync_scheduler._sync_platform_data(user_id, "google_drive", sync_scheduler.sync_configs["google_drive"])
                    st.success("Google Drive sync completed!")
                else:
                    st.error("Google Drive not connected")
        
        with col4:
            if st.button("🔄 Sync Salesforce", key="manual_salesforce"):
                if is_integration_connected("salesforce"):
                    with st.spinner("Syncing Salesforce data..."):
                        sync_scheduler._sync_platform_data(user_id, "salesforce", sync_scheduler.sync_configs["salesforce"])
                    st.success("Salesforce sync completed!")
                else:
                    st.error("Salesforce not connected")
    
    # Sync History
    with st.expander("📋 Sync History", expanded=True):
        # Get recent sync logs
        logs = get_sync_logs(user_id, limit=20)
        
        if logs:
            # Convert to DataFrame for display
            log_data = []
            for log in logs:
                log_data.append({
                    "Platform": log.get("sync_name", "Unknown"),
                    "Date": datetime.fromisoformat(log["start_time"]).strftime("%Y-%m-%d %H:%M"),
                    "Duration": f"{log.get('duration_seconds', 0):.1f}s",
                    "Records": log.get("records_count", 0),
                    "Status": "✅ Success" if log.get("success", False) else "❌ Failed"
                })
            
            df = pd.DataFrame(log_data)
            st.dataframe(df, use_container_width=True)
        else:
            st.info("No sync history available")

def initialize_scheduler():
    """Initialize the scheduler for all users"""
    try:
        # Start the scheduler
        sync_scheduler.start_scheduler()
        
        # Schedule syncs for all users with integrations
        users = get_all_users_with_integrations()
        for user_id in users:
            sync_scheduler.schedule_user_syncs(user_id)
        
        logger.info(f"Initialized scheduler for {len(users)} users")
        
    except Exception as e:
        logger.error(f"Error initializing scheduler: {e}")

# Auto-start scheduler when module is imported
if __name__ != "__main__":
    initialize_scheduler() 