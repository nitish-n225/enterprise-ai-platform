from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.core.database import Base
from backend.app.models.base import TimestampMixin

class Customer(Base, TimestampMixin):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    company = Column(String(120), nullable=True, index=True)
    region = Column(String(50), nullable=False, index=True)  # North America, Europe, Asia-Pacific, LATAM
    tier = Column(String(30), default="Standard", nullable=False)  # Enterprise, Mid-Market, SMB
    status = Column(String(30), default="Active", nullable=False)  # Active, Churned, Lead

    orders = relationship("Order", back_populates="customer", cascade="all, delete-orphan")

class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False, index=True)
    category = Column(String(60), nullable=False, index=True)  # Cloud Software, Security Suite, Hardware, Support Plan, Professional Services
    unit_price = Column(Float, nullable=False)
    cost_price = Column(Float, nullable=False)
    stock_quantity = Column(Integer, default=100, nullable=False)
    is_active = Column(Integer, default=1, nullable=False)

    order_items = relationship("OrderItem", back_populates="product")

class Order(Base, TimestampMixin):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    order_date = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    status = Column(String(30), default="Completed", nullable=False, index=True)  # Completed, Pending, Cancelled, Refunded
    total_amount = Column(Float, nullable=False)
    payment_method = Column(String(50), default="Credit Card", nullable=False)

    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False)
    discount_percent = Column(Float, default=0.0, nullable=False)
    subtotal = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

class SalesRecord(Base, TimestampMixin):
    __tablename__ = "sales_records"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False, index=True)
    region = Column(String(50), nullable=False, index=True)
    channel = Column(String(50), nullable=False)  # Direct Sales, Partner, Online Portal
    gross_revenue = Column(Float, nullable=False)
    net_revenue = Column(Float, nullable=False)
    order_count = Column(Integer, nullable=False)
    customer_count = Column(Integer, nullable=False)

