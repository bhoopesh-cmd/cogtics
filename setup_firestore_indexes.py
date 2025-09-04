#!/usr/bin/env python3
"""
Setup script for Firestore indexes
This script helps you deploy the necessary Firestore indexes for the RLDA application.
"""

import subprocess
import sys
import os

def check_firebase_cli():
    """Check if Firebase CLI is installed"""
    try:
        result = subprocess.run(['firebase', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Firebase CLI found: {result.stdout.strip()}")
            return True
        else:
            print("❌ Firebase CLI not found or not working")
            return False
    except FileNotFoundError:
        print("❌ Firebase CLI not installed")
        return False

def check_firebase_project():
    """Check if Firebase project is configured"""
    try:
        result = subprocess.run(['firebase', 'projects:list'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Firebase project configuration found")
            return True
        else:
            print("❌ Firebase project not configured")
            return False
    except Exception as e:
        print(f"❌ Error checking Firebase project: {e}")
        return False

def deploy_indexes():
    """Deploy Firestore indexes"""
    try:
        print("🚀 Deploying Firestore indexes...")
        result = subprocess.run(['firebase', 'deploy', '--only', 'firestore:indexes'], 
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Firestore indexes deployed successfully!")
            print(result.stdout)
            return True
        else:
            print("❌ Failed to deploy Firestore indexes")
            print(result.stderr)
            return False
    except Exception as e:
        print(f"❌ Error deploying indexes: {e}")
        return False

def main():
    print("=" * 50)
    print("Firestore Indexes Setup")
    print("=" * 50)
    
    # Check prerequisites
    print("\n1. Checking Firebase CLI...")
    if not check_firebase_cli():
        print("\n📋 To install Firebase CLI:")
        print("   npm install -g firebase-tools")
        print("   firebase login")
        return False
    
    print("\n2. Checking Firebase project...")
    if not check_firebase_project():
        print("\n📋 To configure Firebase project:")
        print("   firebase login")
        print("   firebase use rlda-b46bb")
        return False
    
    print("\n3. Deploying indexes...")
    if deploy_indexes():
        print("\n🎉 Setup complete! Your Firestore indexes are now deployed.")
        print("The application should no longer show index warnings.")
        return True
    else:
        print("\n❌ Setup failed. Please check the error messages above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 