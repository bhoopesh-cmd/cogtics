#!/usr/bin/env python3
"""
Test script to verify Firestore integration in RLDA application
"""

import sys
import os

def test_imports():
    """Test if all required modules can be imported"""
    print("Testing imports...")
    
    try:
        import streamlit as st
        print("✓ streamlit imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import streamlit: {e}")
        return False
    
    try:
        import firebase_admin
        from firebase_admin import firestore
        print("✓ firebase_admin and firestore imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import firebase_admin: {e}")
        return False
    
    try:
        import pyrebase
        print("✓ pyrebase imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import pyrebase: {e}")
        return False
    
    try:
        from firestore_service import init_firestore, store_feedback, get_user_feedback
        print("✓ firestore_service imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import firestore_service: {e}")
        return False
    
    try:
        from auth import login_user, signup_user, logout_user, is_logged_in, get_user_email
        print("✓ auth module imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import auth: {e}")
        return False
    
    try:
        from utils import init_session_state, get_user_data_dir
        print("✓ utils module imported successfully")
    except ImportError as e:
        print(f"✗ Failed to import utils: {e}")
        return False
    
    return True

def test_firebase_config():
    """Test Firebase configuration"""
    print("\nTesting Firebase configuration...")
    
    try:
        from firebase_config import get_firebase_config, get_service_account_config, is_firebase_configured
        
        config = get_firebase_config()
        if config and config.get("projectId"):
            print(f"✓ Firebase config found: {config['projectId']}")
        else:
            print("✗ Firebase config not found or incomplete")
            return False
        
        service_account = get_service_account_config()
        if service_account:
            print("✓ Service account config found")
        else:
            print("⚠ Service account config not found (Firestore will be limited)")
        
        is_configured = is_firebase_configured()
        if is_configured:
            print("✓ Firebase is properly configured")
        else:
            print("⚠ Firebase configuration incomplete")
        
        return True
        
    except Exception as e:
        print(f"✗ Error testing Firebase config: {e}")
        return False

def test_firestore_connection():
    """Test Firestore connection"""
    print("\nTesting Firestore connection...")
    
    try:
        from firestore_service import init_firestore
        
        db = init_firestore()
        if db:
            print("✓ Firestore connection established")
            
            # Test a simple read operation
            try:
                test_collection = db.collection("test")
                docs = list(test_collection.limit(1).stream())
                print("✓ Firestore read operation successful")
                return True
            except Exception as e:
                print(f"⚠ Firestore read operation failed: {e}")
                return False
        else:
            print("✗ Failed to establish Firestore connection")
            return False
            
    except Exception as e:
        print(f"✗ Error testing Firestore connection: {e}")
        return False

def test_auth_functions():
    """Test authentication functions"""
    print("\nTesting authentication functions...")
    
    try:
        from auth import is_logged_in, get_user_email
        
        # Test functions without user logged in
        logged_in = is_logged_in()
        email = get_user_email()
        
        print(f"✓ is_logged_in() returned: {logged_in}")
        print(f"✓ get_user_email() returned: {email}")
        
        return True
        
    except Exception as e:
        print(f"✗ Error testing auth functions: {e}")
        return False

def test_utils_functions():
    """Test utility functions"""
    print("\nTesting utility functions...")
    
    try:
        from utils import get_user_data_dir
        
        user_dir = get_user_data_dir()
        print(f"✓ get_user_data_dir() returned: {user_dir}")
        
        # Check if directory exists or can be created
        if os.path.exists(user_dir) or os.makedirs(user_dir, exist_ok=True):
            print("✓ User data directory accessible")
        else:
            print("✗ Cannot access user data directory")
            return False
        
        return True
        
    except Exception as e:
        print(f"✗ Error testing utility functions: {e}")
        return False

def test_session_state():
    """Test session state initialization"""
    print("\nTesting session state...")
    
    try:
        from utils import init_session_state
        
        # Initialize session state
        init_session_state()
        print("✓ Session state initialized")
        
        return True
        
    except Exception as e:
        print(f"✗ Error testing session state: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 50)
    print("RLDA Firestore Integration Test")
    print("=" * 50)
    
    tests = [
        test_imports,
        test_firebase_config,
        test_firestore_connection,
        test_auth_functions,
        test_utils_functions,
        test_session_state
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"✗ Test {test.__name__} failed with exception: {e}")
    
    print("\n" + "=" * 50)
    print(f"Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Firestore integration is working correctly.")
    else:
        print("⚠ Some tests failed. Please check the configuration and dependencies.")
    
    print("=" * 50)
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 