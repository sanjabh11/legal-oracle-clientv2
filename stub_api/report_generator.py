"""
PDF Report Generator for Legal Oracle
Generates professional PDF reports from workflow analysis
"""

from typing import Dict
from datetime import datetime
from io import BytesIO

try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
    REPORTLAB_AVAILABLE = True
except ImportError:
    print("[WARN] reportlab not installed. PDF generation will not work.")
    print("[WARN] Install with: pip install reportlab")
    REPORTLAB_AVAILABLE = False


def generate_workflow_report_pdf(workflow_data: Dict) -> BytesIO:
    """
    Generate PDF report from workflow analysis data
    
    Args:
        workflow_data: Complete workflow output dictionary
        
    Returns:
        BytesIO buffer containing PDF data
    """
    if not REPORTLAB_AVAILABLE:
        raise ImportError("reportlab is required for PDF generation")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75*inch,
        leftMargin=0.75*inch,
        topMargin=1*inch,
        bottomMargin=0.75*inch
    )
    
    # Get styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1e3a8a'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading1_style = ParagraphStyle(
        'CustomHeading1',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#374151'),
        spaceBefore=20,
        spaceAfter=12,
        fontName='Helvetica-Bold'
    )
    
    heading2_style = ParagraphStyle(
        'CustomHeading2',
        parent=styles['Heading3'],
        fontSize=14,
        textColor=colors.HexColor('#4b5563'),
        spaceBefore=15,
        spaceAfter=10,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#1f2937'),
        alignment=TA_JUSTIFY
    )
    
    # Build document
    story = []
    
    # Title page
    story.append(Paragraph("Legal Oracle", title_style))
    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph("Comprehensive Case Analysis Report", heading1_style))
    story.append(Spacer(1, 0.5*inch))
    
    # Metadata
    workflow_id = workflow_data.get("workflow_id", "N/A")
    generated_date = datetime.now().strftime("%B %d, %Y at %I:%M %p")
    
    metadata_data = [
        ["Workflow ID:", workflow_id],
        ["Generated:", generated_date],
        ["Status:", workflow_data.get("status", "unknown").upper()]
    ]
    
    metadata_table = Table(metadata_data, colWidths=[2*inch, 4*inch])
    metadata_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#6b7280')),
        ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1f2937')),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    story.append(metadata_table)
    story.append(Spacer(1, 0.5*inch))
    
    # Get report sections
    final_report = workflow_data.get("final_report", {})
    exec_summary = final_report.get("executive_summary", {})
    detailed = final_report.get("detailed_analysis", {})
    recommendations = final_report.get("recommendations", {})
    
    # Executive Summary
    story.append(Paragraph("Executive Summary", heading1_style))
    story.append(Spacer(1, 0.1*inch))
    
    summary_data = [
        ["Case Strength:", exec_summary.get("case_strength", "N/A").upper()],
        ["Success Probability:", exec_summary.get("success_probability", "N/A")],
        ["Confidence Level:", exec_summary.get("confidence", "N/A")],
        ["Recommended Strategy:", exec_summary.get("recommended_action", "N/A")],
        ["Similar Precedents:", str(exec_summary.get("key_precedents", 0))],
        ["Case Complexity:", exec_summary.get("case_complexity", "N/A").title()]
    ]
    
    summary_table = Table(summary_data, colWidths=[2.5*inch, 3.5*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f9fafb')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1f2937')),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    
    story.append(summary_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Risk Assessment
    story.append(Paragraph("Risk Assessment", heading1_style))
    story.append(Spacer(1, 0.1*inch))
    
    risk_data = detailed.get("risk_assessment", {})
    risk_text = f"""
    Based on analysis of <b>{risk_data.get('precedent_count', 0)}</b> similar precedents, 
    this case has a <b>{risk_data.get('success_probability', 0):.1%}</b> probability of success with 
    <b>{risk_data.get('confidence', 0):.0%}</b> confidence. The case is classified as 
    <b>{risk_data.get('risk_level', 'unknown').upper()}</b> risk.
    <br/><br/>
    <i>{risk_data.get('recommendation', '')}</i>
    """
    
    story.append(Paragraph(risk_text, body_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Precedent Analysis
    story.append(Paragraph("Precedent Analysis", heading1_style))
    story.append(Spacer(1, 0.1*inch))
    
    precedent_analysis = detailed.get("precedent_analysis", {})
    top_cases = precedent_analysis.get("top_3_cases", [])
    
    if top_cases:
        precedent_data = [["Case Name", "Outcome", "Court", "Relevance"]]
        for case in top_cases:
            precedent_data.append([
                case.get("name", "N/A")[:40],
                case.get("outcome", "N/A")[:30],
                case.get("court", "N/A")[:25],
                case.get("relevance", "N/A")
            ])
        
        precedent_table = Table(precedent_data, colWidths=[2.2*inch, 1.8*inch, 1.5*inch, 0.8*inch])
        precedent_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#d1d5db')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')])
        ]))
        
        story.append(precedent_table)
    else:
        story.append(Paragraph("No precedent data available.", body_style))
    
    story.append(PageBreak())
    
    # Strategy Recommendations
    story.append(Paragraph("Strategic Recommendations", heading1_style))
    story.append(Spacer(1, 0.1*inch))
    
    primary_strategy = recommendations.get("primary", "N/A")
    story.append(Paragraph(f"<b>Primary Recommendation:</b> {primary_strategy}", heading2_style))
    story.append(Spacer(1, 0.1*inch))
    
    # Strategy comparison
    all_strategies = detailed.get("strategy_comparison", [])
    if all_strategies:
        for i, strategy in enumerate(all_strategies, 1):
            story.append(Paragraph(f"{i}. {strategy.get('name', 'Unknown Strategy')}", heading2_style))
            story.append(Spacer(1, 0.05*inch))
            
            desc = strategy.get('description', '')
            story.append(Paragraph(f"<i>{desc}</i>", body_style))
            story.append(Spacer(1, 0.05*inch))
            
            # Strategy details
            strategy_details = [
                ["Score:", f"{strategy.get('score', 0):.2f}/1.00"],
                ["Timeline:", f"{strategy.get('timeline_months', 'N/A')} months"],
                ["Risk Level:", strategy.get('risk_level', 'N/A').title()]
            ]
            
            if strategy.get('expected_value'):
                strategy_details.append(["Expected Value:", f"${strategy.get('expected_value', 0):,.2f}"])
            if strategy.get('expected_cost'):
                strategy_details.append(["Expected Cost:", f"${strategy.get('expected_cost', 0):,.2f}"])
            if strategy.get('net_expected_value'):
                strategy_details.append(["Net Expected Value:", f"${strategy.get('net_expected_value', 0):,.2f}"])
            
            detail_table = Table(strategy_details, colWidths=[1.8*inch, 4.5*inch])
            detail_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#6b7280')),
                ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
                ('ALIGN', (1, 0), (1, -1), 'LEFT'),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            
            story.append(detail_table)
            
            # Pros and Cons
            pros = strategy.get('pros', [])
            cons = strategy.get('cons', [])
            
            if pros:
                story.append(Spacer(1, 0.1*inch))
                story.append(Paragraph("<b>Advantages:</b>", body_style))
                for pro in pros:
                    story.append(Paragraph(f"• {pro}", body_style))
            
            if cons:
                story.append(Spacer(1, 0.1*inch))
                story.append(Paragraph("<b>Disadvantages:</b>", body_style))
                for con in cons:
                    story.append(Paragraph(f"• {con}", body_style))
            
            story.append(Spacer(1, 0.2*inch))
    
    story.append(PageBreak())
    
    # Next Steps
    story.append(Paragraph("Recommended Next Steps", heading1_style))
    story.append(Spacer(1, 0.1*inch))
    
    next_steps = recommendations.get("next_steps", [])
    for i, step in enumerate(next_steps, 1):
        story.append(Paragraph(f"{i}. {step}", body_style))
        story.append(Spacer(1, 0.05*inch))
    
    story.append(Spacer(1, 0.3*inch))
    
    # Risk Mitigation
    story.append(Paragraph("Risk Mitigation Strategies", heading1_style))
    story.append(Spacer(1, 0.1*inch))
    
    risk_mitigation = recommendations.get("risk_mitigation", [])
    for i, item in enumerate(risk_mitigation, 1):
        story.append(Paragraph(f"{i}. {item}", body_style))
        story.append(Spacer(1, 0.05*inch))
    
    # Footer
    story.append(Spacer(1, 0.5*inch))
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#9ca3af'),
        alignment=TA_CENTER
    )
    
    story.append(Paragraph(
        f"<i>This report was generated by Legal Oracle using AI-powered analysis. "
        f"Please consult with qualified legal counsel before making decisions.</i>",
        footer_style
    ))
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    
    return buffer


def generate_simple_text_report(workflow_data: Dict) -> str:
    """
    Generate simple text report as fallback
    """
    final_report = workflow_data.get("final_report", {})
    exec_summary = final_report.get("executive_summary", {})
    
    report = f"""
LEGAL ORACLE - CASE ANALYSIS REPORT
====================================

Workflow ID: {workflow_data.get("workflow_id", "N/A")}
Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

EXECUTIVE SUMMARY
-----------------
Case Strength: {exec_summary.get("case_strength", "N/A").upper()}
Success Probability: {exec_summary.get("success_probability", "N/A")}
Confidence: {exec_summary.get("confidence", "N/A")}
Recommended Strategy: {exec_summary.get("recommended_action", "N/A")}

DETAILED ANALYSIS
-----------------
{json.dumps(final_report, indent=2)}

---
This report was generated by Legal Oracle.
Please consult with qualified legal counsel before making decisions.
"""
    
    return report
