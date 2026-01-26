"""
PDF exporter for contracts and invoices using WeasyPrint or fallback to fpdf2.
"""

import logging
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any, Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape

from ..config import config
from ..models.contracts import Contract, ContractClause
from ..models.invoices import Invoice, InvoiceLine

logger = logging.getLogger(__name__)

# Template directory
TEMPLATE_DIR = Path(__file__).parent.parent.parent / "templates"


class PDFExporter:
    """
    Generates PDF documents for contracts and invoices.
    
    Uses WeasyPrint (HTML to PDF) with Jinja2 templates.
    Falls back to fpdf2 if WeasyPrint is not available.
    """
    
    def __init__(self, template_dir: Optional[Path] = None):
        """
        Initialize the PDF exporter.
        
        Args:
            template_dir: Directory containing HTML templates
        """
        self.template_dir = template_dir or TEMPLATE_DIR
        self._weasyprint_available = self._check_weasyprint()
        self._jinja_env = self._setup_jinja()
    
    def _check_weasyprint(self) -> bool:
        """Check if WeasyPrint is available."""
        try:
            from weasyprint import HTML
            return True
        except ImportError:
            logger.warning(
                "WeasyPrint not available. PDF generation will use fallback."
            )
            return False
    
    def _setup_jinja(self) -> Environment:
        """Set up Jinja2 environment."""
        # Ensure template directory exists
        self.template_dir.mkdir(parents=True, exist_ok=True)
        
        return Environment(
            loader=FileSystemLoader(str(self.template_dir)),
            autoescape=select_autoescape(["html", "xml"]),
        )
    
    def generate_contract_pdf(
        self,
        contract: Contract,
        clauses: list[ContractClause],
        output_path: str,
        template_name: Optional[str] = None,
    ) -> str:
        """
        Generate a contract PDF.
        
        Args:
            contract: Contract model
            clauses: List of contract clauses
            output_path: Path to save the PDF
            template_name: Optional custom template name
            
        Returns:
            Path to generated PDF
        """
        # Determine template
        if template_name is None:
            template_name = f"contract_{contract.status.lower()}.html"
        
        # Try to load template, fall back to default
        try:
            template = self._jinja_env.get_template(template_name)
        except:
            template = self._get_default_contract_template()
        
        # Render HTML
        html_content = template.render(
            contract=contract,
            clauses=clauses,
            generation_date=date.today().isoformat(),
        )
        
        # Generate PDF
        return self._render_pdf(html_content, output_path)
    
    def generate_invoice_pdf(
        self,
        invoice: Invoice,
        lines: list[InvoiceLine],
        output_path: str,
        company_info: Optional[dict[str, str]] = None,
    ) -> str:
        """
        Generate an invoice PDF.
        
        Args:
            invoice: Invoice model
            lines: List of invoice lines
            output_path: Path to save the PDF
            company_info: Optional company information
            
        Returns:
            Path to generated PDF
        """
        # Try to load template
        try:
            template = self._jinja_env.get_template("invoice.html")
        except:
            template = self._get_default_invoice_template()
        
        # Default company info
        if company_info is None:
            company_info = {
                "name": "Cogtics, Inc.",
                "address": "123 Technology Way",
                "city_state_zip": "San Francisco, CA 94105",
                "email": "billing@cogtics.io",
            }
        
        # Render HTML
        html_content = template.render(
            invoice=invoice,
            lines=lines,
            company=company_info,
            generation_date=date.today().isoformat(),
        )
        
        # Generate PDF
        return self._render_pdf(html_content, output_path)
    
    def _render_pdf(self, html_content: str, output_path: str) -> str:
        """Render HTML to PDF."""
        # Ensure output directory exists
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        
        if self._weasyprint_available:
            return self._render_with_weasyprint(html_content, output_path)
        else:
            return self._render_with_fallback(html_content, output_path)
    
    def _render_with_weasyprint(
        self, html_content: str, output_path: str
    ) -> str:
        """Render PDF using WeasyPrint."""
        from weasyprint import HTML, CSS
        
        # Base CSS for professional documents
        base_css = CSS(string="""
            @page {
                size: letter;
                margin: 1in;
            }
            body {
                font-family: Arial, sans-serif;
                font-size: 11pt;
                line-height: 1.4;
            }
            h1 { font-size: 18pt; margin-bottom: 20px; }
            h2 { font-size: 14pt; margin-top: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; text-align: left; }
            .header { margin-bottom: 30px; }
            .footer { margin-top: 30px; }
        """)
        
        HTML(string=html_content).write_pdf(
            output_path,
            stylesheets=[base_css],
        )
        
        logger.info(f"Generated PDF: {output_path}")
        return output_path
    
    def _render_with_fallback(
        self, html_content: str, output_path: str
    ) -> str:
        """Render PDF using fpdf2 as fallback (simpler output)."""
        try:
            from fpdf import FPDF
        except ImportError:
            logger.error(
                "Neither WeasyPrint nor fpdf2 available. "
                "Cannot generate PDF."
            )
            # Save as HTML instead
            html_path = output_path.replace(".pdf", ".html")
            with open(html_path, "w", encoding="utf-8") as f:
                f.write(html_content)
            logger.info(f"Saved as HTML: {html_path}")
            return html_path
        
        # Simple PDF generation with fpdf2
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=11)
        
        # Strip HTML and add text
        import re
        text = re.sub(r"<[^>]+>", "\n", html_content)
        text = re.sub(r"\n+", "\n", text).strip()
        
        for line in text.split("\n"):
            pdf.multi_cell(0, 10, line.strip())
        
        pdf.output(output_path)
        logger.info(f"Generated PDF (fallback): {output_path}")
        return output_path
    
    def _get_default_contract_template(self):
        """Get default contract HTML template."""
        html = """
<!DOCTYPE html>
<html>
<head>
    <title>{{ contract.name or 'Agreement' }}</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; }
        h1 { text-align: center; font-size: 16pt; }
        .parties { margin: 20px 0; }
        .clause { margin: 15px 0; }
        .clause-title { font-weight: bold; }
        .signature-block { margin-top: 50px; }
        .signature-line { border-bottom: 1px solid black; width: 200px; display: inline-block; }
    </style>
</head>
<body>
    <h1>{{ contract.name or 'AGREEMENT' }}</h1>
    
    <div class="parties">
        <p>This Agreement is entered into as of {{ contract.start_date or 'the Effective Date' }}.</p>
    </div>
    
    {% for clause in clauses %}
    <div class="clause">
        <span class="clause-title">{{ clause.clause_label }}. </span>
        {{ clause.text }}
    </div>
    {% endfor %}
    
    <div class="signature-block">
        <p>IN WITNESS WHEREOF, the parties have executed this Agreement.</p>
        <br><br>
        <p>By: <span class="signature-line"></span> Date: <span class="signature-line"></span></p>
    </div>
</body>
</html>
"""
        from jinja2 import Template
        return Template(html)
    
    def _get_default_invoice_template(self):
        """Get default invoice HTML template."""
        html = """
<!DOCTYPE html>
<html>
<head>
    <title>Invoice {{ invoice.invoice_number }}</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 10pt; }
        .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .company { font-weight: bold; }
        .invoice-title { font-size: 24pt; color: #333; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f0f0f0; padding: 10px; text-align: left; border-bottom: 2px solid #333; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        .total-row { font-weight: bold; background: #f9f9f9; }
        .amount { text-align: right; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company">
            <strong>{{ company.name }}</strong><br>
            {{ company.address }}<br>
            {{ company.city_state_zip }}<br>
            {{ company.email }}
        </div>
        <div>
            <span class="invoice-title">INVOICE</span><br>
            <strong>Invoice #:</strong> {{ invoice.invoice_number }}<br>
            <strong>Date:</strong> {{ invoice.invoice_date }}<br>
            <strong>Due Date:</strong> {{ invoice.due_date or 'Upon Receipt' }}
        </div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th>Qty</th>
                <th class="amount">Unit Price</th>
                <th class="amount">Amount</th>
            </tr>
        </thead>
        <tbody>
            {% for line in lines %}
            <tr>
                <td>{{ line.description or 'Service' }}</td>
                <td>{{ line.quantity }}</td>
                <td class="amount">{{ '${:,.2f}'.format(line.unit_price or 0) }}</td>
                <td class="amount">{{ '${:,.2f}'.format(line.amount) }}</td>
            </tr>
            {% endfor %}
        </tbody>
        <tfoot>
            <tr>
                <td colspan="3" class="amount"><strong>Subtotal</strong></td>
                <td class="amount">{{ '${:,.2f}'.format(invoice.subtotal or 0) }}</td>
            </tr>
            <tr>
                <td colspan="3" class="amount">Tax</td>
                <td class="amount">{{ '${:,.2f}'.format(invoice.tax) }}</td>
            </tr>
            <tr class="total-row">
                <td colspan="3" class="amount"><strong>Total Due</strong></td>
                <td class="amount"><strong>{{ '${:,.2f}'.format(invoice.total) }}</strong></td>
            </tr>
        </tfoot>
    </table>
    
    <p><strong>Payment Terms:</strong> Net 30</p>
</body>
</html>
"""
        from jinja2 import Template
        return Template(html)
    
    def create_default_templates(self) -> None:
        """Create default HTML templates if they don't exist."""
        templates = {
            "contract_msa.html": self._get_default_contract_template().source,
            "contract_order_form.html": self._get_default_contract_template().source,
            "invoice.html": self._get_default_invoice_template().source,
        }
        
        for name, content in templates.items():
            path = self.template_dir / name
            if not path.exists():
                path.write_text(content)
                logger.info(f"Created template: {path}")
