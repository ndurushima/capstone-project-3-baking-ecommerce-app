from __future__ import annotations

from datetime import datetime, date, time
from typing import List, Optional

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import (CheckConstraint, UniqueConstraint, Index, ForeignKey, Integer, String, Date, Time, DateTime, Numeric, Boolean, text)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from werkzeug.security import generate_password_hash, check_password_hash

from .enums import UserRole, CartStatus, OrderStatus, FulfillmentMethod

db = SQLAlchemy()

def utcnow() -> datetime:
    return datetime.utcnow()



class User(db.Model):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(db.Enum(UserRole), default=UserRole.customer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    carts: Mapped[List["Cart"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    orders: Mapped[List["Order"]] = relationship(back_populates="user", cascade="all, delete-orphan")


    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role.value,
            "created_at": self.created_at.isoformat() + "Z",
        }
    

    def __repr__(self) -> str:
        return f"<User {self.id} {self.email} {self.role.value}>"


class Product(db.Model):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(String(2000))
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(500))

    allergens_csv: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    cart_items: Mapped[List["CartItem"]] = relationship(back_populates="product")
    order_items: Mapped[List["OrderItem"]] = relationship(back_populates="product")

    __table_args__ = (
        CheckConstraint("price >= 0", name="check_price_non_negative"),
        Index("ix_products_active_name", "is_active", "name")
    )


    @property
    def allergens(self) -> List[str]:
        return [a for a in self.allergens_csv.split(",") if a.strip()] if self.allergens_csv else []
    
    @allergens.setter
    def allergens(self, values: List[str]) -> None:
        self.allergens_csv = ",".join(sorted({v.strip() for v in values if v.strip()}))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price": float(self.price),
            "image_url": self.image_url,
            "allergens": self.allergens,
            "is_active": self.is_active,
        }
    
    def __repr__(self) -> str:
        return f"<Product {self.id} {self.name}${self.price}>"



class Cart(db.Model):
    __tablename__ = "carts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[CartStatus] = mapped_column(db.Enum(CartStatus), default=CartStatus.draft, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    user: Mapped["User"] = relationship(back_populates="carts")
    items: Mapped[List["CartItem"]] = relationship(back_populates="cart", cascade="all, delete-orphan", lazy="joined")

    __table_args__ = (Index("ix_carts_user_status", "user_id", "status"),)

    @property
    def total(self) -> float:
        return float(sum((ci.qty or 0) * float(ci.product.price) for ci in self.items))
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "status": self.status.value,
            "items": [ci.to_dict() for ci in self.items],
            "total": self.total,
            "updated_at": self.updated_at.isformat() + "Z",
        }



class CartItem(db.Model):
    __tablename__ = "cart_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    cart_id: Mapped[int] = mapped_column(ForeignKey("carts.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    qty: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    cart: Mapped["Cart"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship(back_populates="cart_items")

    __table_args__ = (
        UniqueConstraint("cart_id", "product_id", name="uq_cartitem_cart_product"),
        CheckConstraint("qty > 0", name="ck_cartitem_qty_pos"),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "cart_id": self.cart_id,
            "product_id": self.product_id,
            "qty": self.qty,
            "product": self.product.to_dict() if self.product else None,
            "line_total": float(self.qty * float(self.product.price)) if self.product else 0.0,
        }


class Order(db.Model):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    total: Mapped[float] = mapped_column(Numeric(10, 2), nullable= False, default=0)

    fulfillment_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    requested_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)

    fulfillment_method: Mapped[FulfillmentMethod] = mapped_column(db.Enum(FulfillmentMethod), nullable=False, default=FulfillmentMethod.pickup)

    delivery_name: Mapped[Optional[str]] = mapped_column(String(200))
    delivery_line1: Mapped[Optional[str]] = mapped_column(String(200))
    delivery_line2: Mapped[Optional[str]] = mapped_column(String(200))
    delivery_city: Mapped[Optional[str]] = mapped_column(String(100))
    delivery_state: Mapped[Optional[str]] = mapped_column(String(50))
    delivery_zip: Mapped[Optional[str]] = mapped_column(String(20))

    status: Mapped[OrderStatus] = mapped_column(db.Enum(OrderStatus), default=OrderStatus.placed, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)

    user: Mapped[Optional["User"]] = relationship(back_populates="orders")
    items: Mapped[List["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan", lazy="joined")

    __table_args__ = (
        CheckConstraint("total >= 0", name="ck_orders_total_nonneg"),
        Index("ix_orders_user_created", "user_id", "created_at"),
        Index(
            "uq_orders_one_per_day_active",
            "fulfillment_date",
            unique=True,
            postgresql_where=text("status IN ('placed','complete')")
        ),
    )

    def recalculate_total(self) -> None:
        self.total = sum((oi.qty or 0) * (oi.price_snapshot or 0) for oi in self.items)

    def _format_time(self) -> Optional[str]:
        return self.requested_time.isoformat(timespec="minutes") if self.requested_time else None
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "fulfillment_date": self.fulfillment_date.isoformat(),
            "requested_time": self._format_time(),
            "fulfillment_method": self.fulfillment_method.value,
            "status": self.status.value,
            "total": float(self.total),
            "items": [oi.to_dict() for oi in self.items],
            "created_at": self.created_at.isoformat() + "Z",
            "delivery": {
                "name": self.delivery_name,
                "line1": self.delivery_line1,
                "line2": self.delivery_line2,
                "city": self.delivery_city,
                "state": self.delivery_state,
                "zip": self.delivery_zip,
            } if self.fulfillment_method == FulfillmentMethod.delivery else None,
        }


class OrderItem(db.Model):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False, index=True)
    qty: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    price_snapshot: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    order: Mapped["Order"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship(back_populates="order_items")

    __table_args__ = (
        CheckConstraint("qty > 0", name="ck_orderitem_qty_pos"),
        CheckConstraint("price_snapshot >= 0", name="ck_orderitem_price_nonneg"),
    )

    @property
    def line_total(self) -> float:
        return float(self.qty * float(self.price_snapshot))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "order_id": self.order_id,
            "product_id": self.product_id,
            "qty": self.qty,
            "price_snapshot": float(self.price_snapshot),
            "line_total": self.line_total,
            "product": self.product.to_dict() if self.product else None,
        }

