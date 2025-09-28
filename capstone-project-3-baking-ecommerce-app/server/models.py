from __future__ import annotations

import enum
from datetime import datetime, date
from typing import List, Optional

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import (CheckConstraint, UniqueConstraint, Index, func, ForeignKey, Integer, String, Date, DateTime, Numeric, Boolean)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from werkzeug.security import generate_password_hash, check_password_hash

from .enums import UserRole, CartStatus, OrderStatus


db = SQLAlchemy()