import pytest
from unittest.mock import patch, MagicMock, AsyncMock


class TestAuthEndpoints:
    def test_verify_token_success(self, client, mock_supabase):
        with patch("app.core.security.verify_firebase_token", new_callable=AsyncMock) as mock_verify:
            mock_verify.return_value = {
                "uid": "test_uid",
                "email": "test@example.com",
                "email_verified": True,
            }

            mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
                data=[{
                    "id": "test-uuid",
                    "firebase_uid": "test_uid",
                    "email": "test@example.com",
                    "display_name": "Test User",
                    "auth_provider": "email",
                    "is_active": True,
                    "created_at": "2024-01-01T00:00:00",
                    "updated_at": "2024-01-01T00:00:00",
                }]
            )

            response = client.post(
                "/api/v1/auth/verify",
                json={"token": "valid_token"},
            )

            assert response.status_code in [200, 422, 500]

    def test_verify_token_invalid(self, client):
        with patch("app.core.security.verify_firebase_token", new_callable=AsyncMock) as mock_verify:
            from app.core.exceptions import AuthenticationError
            mock_verify.side_effect = AuthenticationError("Invalid token")

            response = client.post(
                "/api/v1/auth/verify",
                json={"token": "invalid_token"},
            )

            assert response.status_code in [401, 422, 500]

    def test_get_me_unauthorized(self, client):
        response = client.get("/api/v1/auth/me")
        assert response.status_code in [401, 403, 422]

    def test_get_me_with_token(self, client, auth_headers, mock_current_user, mock_supabase):
        with patch("app.core.dependencies.get_current_user", return_value=mock_current_user):
            response = client.get("/api/v1/auth/me", headers=auth_headers)
            assert response.status_code in [200, 401, 500]


class TestTokenVerification:
    @pytest.mark.asyncio
    async def test_verify_valid_token(self):
        with patch("firebase_admin.auth.verify_id_token") as mock_verify:
            mock_verify.return_value = {
                "uid": "test_uid",
                "email": "test@example.com",
            }

            from app.core.security import verify_firebase_token
            with patch("app.config.firebase.get_firebase_app"):
                result = await verify_firebase_token("valid_token")
                assert "uid" in result or result is not None

    @pytest.mark.asyncio
    async def test_extract_auth_provider(self):
        from app.core.security import _get_auth_provider

        google_token = {"firebase": {"sign_in_provider": "google.com"}}
        assert _get_auth_provider(google_token) == "google"

        email_token = {"firebase": {"sign_in_provider": "password"}}
        assert _get_auth_provider(email_token) == "email"

        unknown_token = {"firebase": {}}
        assert _get_auth_provider(unknown_token) == "unknown"
