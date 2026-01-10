"""Export API Endpoints."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
import io

from app.core.dependencies import get_current_user
from app.models.user import User
from app.exports.service import export_service

router = APIRouter()


# ==================== Portfolio Exports ====================

@router.get("/portfolio/pdf")
async def export_portfolio_pdf(
    portfolio_id: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    """
    Export portfolio report as PDF.

    Returns downloadable PDF file with:
    - Portfolio summary
    - Holdings details
    - Sector allocation
    - Risk metrics
    """
    pdf_bytes = await export_service.export_portfolio_pdf(
        current_user.firebase_uid,
        portfolio_id,
    )

    filename = f"portfolio_report_{datetime.utcnow().strftime('%Y%m%d')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
        },
    )


@router.get("/portfolio/csv")
async def export_portfolio_csv(
    portfolio_id: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    """
    Export portfolio holdings as CSV.

    Returns downloadable CSV file with holdings data.
    """
    csv_content = await export_service.export_portfolio_csv(
        current_user.firebase_uid,
        portfolio_id,
    )

    filename = f"portfolio_holdings_{datetime.utcnow().strftime('%Y%m%d')}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
        },
    )


@router.get("/portfolio/excel")
async def export_portfolio_excel(
    portfolio_id: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    """
    Export portfolio as Excel.

    Returns downloadable Excel file with:
    - Summary sheet
    - Holdings sheet
    - Sector breakdown sheet
    """
    excel_bytes = await export_service.export_portfolio_excel(
        current_user.firebase_uid,
        portfolio_id,
    )

    filename = f"portfolio_{datetime.utcnow().strftime('%Y%m%d')}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
        },
    )


# ==================== Transaction Exports ====================

@router.get("/transactions/pdf")
async def export_transactions_pdf(
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    """Export transaction history as PDF."""
    pdf_bytes = await export_service.export_transactions_pdf(
        current_user.firebase_uid,
        start_date,
        end_date,
    )

    filename = f"transactions_{datetime.utcnow().strftime('%Y%m%d')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
        },
    )


@router.get("/transactions/csv")
async def export_transactions_csv(
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    """Export transaction history as CSV."""
    csv_content = await export_service.export_transactions_csv(
        current_user.firebase_uid,
        start_date,
        end_date,
    )

    filename = f"transactions_{datetime.utcnow().strftime('%Y%m%d')}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
        },
    )


@router.get("/transactions/excel")
async def export_transactions_excel(
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
    current_user: User = Depends(get_current_user),
):
    """Export transaction history as Excel."""
    excel_bytes = await export_service.export_transactions_excel(
        current_user.firebase_uid,
        start_date,
        end_date,
    )

    filename = f"transactions_{datetime.utcnow().strftime('%Y%m%d')}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
        },
    )


# ==================== Watchlist Exports ====================

@router.get("/watchlist/{watchlist_id}/pdf")
async def export_watchlist_pdf(
    watchlist_id: str,
    current_user: User = Depends(get_current_user),
):
    """Export watchlist as PDF."""
    pdf_bytes = await export_service.export_watchlist_pdf(
        current_user.firebase_uid,
        watchlist_id,
    )

    filename = f"watchlist_{datetime.utcnow().strftime('%Y%m%d')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
        },
    )


@router.get("/watchlist/{watchlist_id}/csv")
async def export_watchlist_csv(
    watchlist_id: str,
    current_user: User = Depends(get_current_user),
):
    """Export watchlist as CSV."""
    csv_content = await export_service.export_watchlist_csv(
        current_user.firebase_uid,
        watchlist_id,
    )

    filename = f"watchlist_{datetime.utcnow().strftime('%Y%m%d')}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
        },
    )


@router.get("/watchlist/{watchlist_id}/excel")
async def export_watchlist_excel(
    watchlist_id: str,
    current_user: User = Depends(get_current_user),
):
    """Export watchlist as Excel."""
    excel_bytes = await export_service.export_watchlist_excel(
        current_user.firebase_uid,
        watchlist_id,
    )

    filename = f"watchlist_{datetime.utcnow().strftime('%Y%m%d')}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
        },
    )


# ==================== Goals Exports ====================

@router.get("/goals/csv")
async def export_goals_csv(
    current_user: User = Depends(get_current_user),
):
    """Export investment goals as CSV."""
    csv_content = await export_service.export_goals_csv(current_user.firebase_uid)

    filename = f"goals_{datetime.utcnow().strftime('%Y%m%d')}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
        },
    )


@router.get("/goals/excel")
async def export_goals_excel(
    current_user: User = Depends(get_current_user),
):
    """Export investment goals as Excel."""
    excel_bytes = await export_service.export_goals_excel(current_user.firebase_uid)

    filename = f"goals_{datetime.utcnow().strftime('%Y%m%d')}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
        },
    )


# ==================== Alerts Exports ====================

@router.get("/alerts/csv")
async def export_alerts_csv(
    current_user: User = Depends(get_current_user),
):
    """Export price alerts as CSV."""
    csv_content = await export_service.export_alerts_csv(current_user.firebase_uid)

    filename = f"alerts_{datetime.utcnow().strftime('%Y%m%d')}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
        },
    )
