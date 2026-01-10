import firebase_admin
from firebase_admin import auth, credentials

from app.config.settings import settings


def initialize_firebase():
    if not firebase_admin._apps:
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": settings.firebase_project_id,
            "private_key": settings.firebase_private_key.replace("\\n", "\n"),
            "client_email": settings.firebase_client_email,
            "token_uri": "https://oauth2.googleapis.com/token",
        })
        firebase_admin.initialize_app(cred)
    return firebase_admin.get_app()


firebase_app = None


def get_firebase_app():
    global firebase_app
    if firebase_app is None:
        firebase_app = initialize_firebase()
    return firebase_app


__all__ = ["firebase_app", "auth", "get_firebase_app", "initialize_firebase"]
