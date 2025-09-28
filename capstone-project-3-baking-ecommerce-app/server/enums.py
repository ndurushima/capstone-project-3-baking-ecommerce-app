import enum

class UserRole(enum.Enum):
    customer = "customer"
    admin = "admin"


class CartStatus(enum.Enum):
    draft = "draft"
    checked_out = "checked_out"


class OrderStatus(enum.Enum):
    placed = "placed"
    complete = "complete"
    canceled = "canceled"