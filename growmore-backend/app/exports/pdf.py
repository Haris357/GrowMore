"""PDF Generation using ReportLab."""

import io
from datetime import datetime
from typing import Any, Dict, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT


class PDFGenerator:
    """Generate PDF documents."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles."""
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=colors.HexColor('#1f2937'),
        ))
        self.styles.add(ParagraphStyle(
            name='CustomHeading',
            parent=self.styles['Heading2'],
            fontSize=16,
            spaceAfter=12,
            spaceBefore=20,
            textColor=colors.HexColor('#374151'),
        ))
        self.styles.add(ParagraphStyle(
            name='CustomBody',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=8,
            textColor=colors.HexColor('#4b5563'),
        ))
        self.styles.add(ParagraphStyle(
            name='RightAlign',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_RIGHT,
        ))

    def generate_portfolio_report(
        self,
        user_name: str,
        report_data: Dict[str, Any],
        report_period: Optional[str] = None,
    ) -> bytes:
        """
        Generate portfolio report PDF.

        Args:
            user_name: User's name
            report_data: Portfolio analytics data
            report_period: Optional period string

        Returns:
            PDF file bytes
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm,
        )

        elements = []

        # Title
        period = report_period or datetime.utcnow().strftime("%B %Y")
        elements.append(Paragraph(
            f"Portfolio Report - {period}",
            self.styles['CustomTitle']
        ))
        elements.append(Paragraph(
            f"Prepared for: {user_name}",
            self.styles['CustomBody']
        ))
        elements.append(Paragraph(
            f"Generated: {datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')}",
            self.styles['CustomBody']
        ))
        elements.append(Spacer(1, 20))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
        elements.append(Spacer(1, 20))

        # Summary Section
        summary = report_data.get("summary", {})
        elements.append(Paragraph("Portfolio Summary", self.styles['CustomHeading']))

        summary_data = [
            ["Total Value", f"PKR {summary.get('total_value', 0):,.2f}"],
            ["Total Invested", f"PKR {summary.get('total_invested', 0):,.2f}"],
            ["Total Gain/Loss", f"PKR {summary.get('total_gain_loss', 0):,.2f}"],
            ["Return %", f"{summary.get('gain_loss_percentage', 0):.2f}%"],
            ["Holdings Count", str(summary.get('holdings_count', 0))],
        ]

        summary_table = Table(summary_data, colWidths=[3*inch, 3*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f9fafb')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#374151')),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('PADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 30))

        # Holdings Section
        holdings = report_data.get("holdings", [])
        if holdings:
            elements.append(Paragraph("Holdings Detail", self.styles['CustomHeading']))

            holdings_data = [["Symbol", "Name", "Qty", "Avg Price", "Current", "Value", "Gain/Loss"]]
            for h in holdings[:20]:  # Limit to 20
                holdings_data.append([
                    h.get("symbol", ""),
                    (h.get("name", "") or "")[:15],
                    str(h.get("quantity", 0)),
                    f"{h.get('average_price', 0):,.0f}",
                    f"{h.get('current_price', 0):,.0f}",
                    f"{h.get('current_value', 0):,.0f}",
                    f"{h.get('gain_loss_pct', 0):.1f}%",
                ])

            holdings_table = Table(
                holdings_data,
                colWidths=[0.8*inch, 1.2*inch, 0.5*inch, 0.9*inch, 0.9*inch, 0.9*inch, 0.8*inch]
            )
            holdings_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#374151')),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ]))
            elements.append(holdings_table)
            elements.append(Spacer(1, 30))

        # Sector Breakdown
        sector_breakdown = report_data.get("sector_breakdown", [])
        if sector_breakdown:
            elements.append(Paragraph("Sector Allocation", self.styles['CustomHeading']))

            sector_data = [["Sector", "Value (PKR)", "Allocation %", "Holdings"]]
            for s in sector_breakdown:
                sector_data.append([
                    s.get("sector", "Other"),
                    f"{s.get('value', 0):,.0f}",
                    f"{s.get('percentage', 0):.1f}%",
                    str(s.get("holdings_count", 0)),
                ])

            sector_table = Table(sector_data, colWidths=[2*inch, 1.5*inch, 1.2*inch, 0.8*inch])
            sector_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#374151')),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('PADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ]))
            elements.append(sector_table)
            elements.append(Spacer(1, 30))

        # Risk Metrics
        risk = report_data.get("risk_metrics", {})
        if risk:
            elements.append(Paragraph("Risk Analysis", self.styles['CustomHeading']))

            risk_data = [
                ["Concentration Risk", f"{risk.get('concentration_risk', 0):.1f}%"],
                ["Diversification Score", f"{risk.get('diversification_score', 0):.0f}/100"],
                ["Unique Sectors", str(risk.get("unique_sectors", 0))],
                ["Risk Level", risk.get("risk_level", "N/A").title()],
            ]

            risk_table = Table(risk_data, colWidths=[3*inch, 3*inch])
            risk_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f9fafb')),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#374151')),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('PADDING', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ]))
            elements.append(risk_table)

        # Footer
        elements.append(Spacer(1, 40))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
        elements.append(Spacer(1, 10))
        elements.append(Paragraph(
            "This report is generated by GrowMore. Investment values are based on latest available market data.",
            ParagraphStyle(
                name='Footer',
                fontSize=8,
                textColor=colors.HexColor('#9ca3af'),
                alignment=TA_CENTER,
            )
        ))

        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    def generate_transaction_history(
        self,
        user_name: str,
        transactions: List[Dict[str, Any]],
        date_range: Optional[str] = None,
    ) -> bytes:
        """Generate transaction history PDF."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm,
        )

        elements = []

        # Title
        elements.append(Paragraph("Transaction History", self.styles['CustomTitle']))
        elements.append(Paragraph(f"Account: {user_name}", self.styles['CustomBody']))
        if date_range:
            elements.append(Paragraph(f"Period: {date_range}", self.styles['CustomBody']))
        elements.append(Paragraph(
            f"Generated: {datetime.utcnow().strftime('%B %d, %Y')}",
            self.styles['CustomBody']
        ))
        elements.append(Spacer(1, 20))

        # Transactions Table
        if transactions:
            table_data = [["Date", "Type", "Symbol", "Qty", "Price", "Total", "Status"]]
            for t in transactions:
                table_data.append([
                    t.get("date", "")[:10] if t.get("date") else "",
                    t.get("type", "").upper(),
                    t.get("symbol", ""),
                    str(t.get("quantity", 0)),
                    f"{t.get('price', 0):,.2f}",
                    f"{t.get('total', 0):,.2f}",
                    t.get("status", "").title(),
                ])

            table = Table(
                table_data,
                colWidths=[0.9*inch, 0.7*inch, 0.8*inch, 0.6*inch, 0.9*inch, 1*inch, 0.7*inch]
            )
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#374151')),
                ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
                ('ALIGN', (3, 1), (5, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ]))
            elements.append(table)
        else:
            elements.append(Paragraph("No transactions found.", self.styles['CustomBody']))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    def generate_watchlist_report(
        self,
        user_name: str,
        watchlist_name: str,
        stocks: List[Dict[str, Any]],
    ) -> bytes:
        """Generate watchlist PDF."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm,
        )

        elements = []

        # Title
        elements.append(Paragraph(f"Watchlist: {watchlist_name}", self.styles['CustomTitle']))
        elements.append(Paragraph(
            f"Generated: {datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')}",
            self.styles['CustomBody']
        ))
        elements.append(Spacer(1, 20))

        # Stocks Table
        if stocks:
            table_data = [["Symbol", "Name", "Price", "Change", "Change %", "Volume"]]
            for s in stocks:
                change = s.get("change_amount", 0) or 0
                change_str = f"+{change:,.2f}" if change >= 0 else f"{change:,.2f}"
                change_pct = s.get("change_percentage", 0) or 0
                change_pct_str = f"+{change_pct:.2f}%" if change_pct >= 0 else f"{change_pct:.2f}%"

                table_data.append([
                    s.get("symbol", ""),
                    (s.get("name", "") or "")[:20],
                    f"{s.get('current_price', 0):,.2f}",
                    change_str,
                    change_pct_str,
                    f"{s.get('volume', 0):,}",
                ])

            table = Table(
                table_data,
                colWidths=[0.8*inch, 1.8*inch, 0.9*inch, 0.9*inch, 0.9*inch, 1*inch]
            )
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1f2937')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#374151')),
                ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('PADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ]))
            elements.append(table)
        else:
            elements.append(Paragraph("No stocks in watchlist.", self.styles['CustomBody']))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
