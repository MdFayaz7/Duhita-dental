"""Invoice arithmetic. Every total is computed here from the line items, never taken from the browser."""
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import InvoiceItemIn
from .tables import Invoice, InvoiceItem, Payment

CENT = Decimal("0.01")


def rupees(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def line_amounts(item: InvoiceItemIn) -> tuple[Decimal, Decimal, Decimal, Decimal]:
    """(gross, discount, tax, total) for one line. Tax applies after the discount, as on Practo invoices."""
    gross = rupees(item.unit_cost * item.qty)
    discount = rupees(gross * item.discount_value / 100) if item.discount_type == "pct" else rupees(item.discount_value)
    discount = min(discount, gross)
    tax = rupees((gross - discount) * item.tax_pct / 100)
    return gross, discount, tax, gross - discount + tax


def build_items(items: list[InvoiceItemIn]) -> tuple[list[InvoiceItem], dict[str, Decimal]]:
    rows, totals = [], {"subtotal": Decimal(0), "discount": Decimal(0), "tax": Decimal(0), "total": Decimal(0)}
    for position, item in enumerate(items):
        gross, discount, tax, total = line_amounts(item)
        rows.append(InvoiceItem(**item.model_dump(), position=position, total=total))
        for key, value in (("subtotal", gross), ("discount", discount), ("tax", tax), ("total", total)):
            totals[key] += value
    return rows, totals


async def refresh_paid(session: AsyncSession, invoice: Invoice) -> None:
    invoice.paid = await session.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.invoice_id == invoice.id)) or Decimal(0)
