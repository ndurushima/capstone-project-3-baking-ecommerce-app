import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";

const FALLBACK_IMG = "/placeholder-dessert.jpg";

export default function Checkout() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState(false);

  const [fulfillmentDate, setFulfillmentDate] = useState("");   // YYYY-MM-DD
  const [requestedTime, setRequestedTime] = useState("");       // HH:MM (24h)
  const [method, setMethod] = useState("pickup");               // "pickup" | "delivery"

  const [delivery, setDelivery] = useState({
    name: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
  });

  async function loadCart() {
    if (!token) return;
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get("/cart/");
      setCart(data);
    } catch (e) {
      setErr(e?.response?.data?.error || "Failed to load cart");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCart();
  }, [token]);

  const subtotal =
    cart?.items?.reduce((sum, it) => sum + (it.line_total || 0), 0) || 0;

  function canPlace() {
    if (!fulfillmentDate) return false;
    if (method === "delivery") {
      const d = delivery;
      if (!d.name || !d.line1 || !d.city || !d.state || !d.zip) return false;
    }
    return (cart?.items?.length || 0) > 0;
    // requestedTime is optional by design
  }

  async function placeOrder() {
    setErr("");
    try {
      const payload = {
        fulfillment_date: fulfillmentDate,
        requested_time: requestedTime || undefined, 
        fulfillment_method: method,
        ...(method === "delivery"
          ? {
              delivery: {
                name: delivery.name,
                line1: delivery.line1,
                line2: delivery.line2,
                city: delivery.city,
                state: delivery.state,
                zip: delivery.zip,
              },
            }
          : {}),
      };

      const { data } = await api.post("/checkout", payload);
      navigate(`/order-confirmation/${data.id}`);

      setSuccess(true);
      // optional: navigate to My Orders right away:
      // navigate("/orders");
    } catch (e) {
      // Show the server’s message (409 = date already booked)
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.msg ||
        "Checkout failed";
      setErr(msg);
    }
  }

  if (!token) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="info">Please log in to proceed to checkout.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ my: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Checkout
      </Typography>

      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      {loading && (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      )}

      {!loading && success && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            ✅ Order placed!
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            You’ll receive a confirmation shortly.
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={() => navigate("/orders")}>
              View My Orders
            </Button>
            <Button variant="outlined" onClick={() => navigate("/")}>
              Back to Catalog
            </Button>
          </Stack>
        </Paper>
      )}

      {!loading && !success && (!cart || cart.items.length === 0) && (
        <Paper sx={{ p: 3 }}>
          <Typography>Your cart is empty.</Typography>
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate("/")}>
            Browse Desserts
          </Button>
        </Paper>
      )}

      {!loading && !success && cart && cart.items.length > 0 && (
        <>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Order Summary
            </Typography>
            <Stack spacing={2} divider={<Divider flexItem />}>
              {cart.items.map((it) => (
                <Stack key={it.id} direction="row" spacing={2} alignItems="center">
                  <img
                    src={it.product?.image_url || FALLBACK_IMG}
                    alt={it.product?.name || "Dessert"}
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_IMG;
                    }}
                    style={{ width: 72, height: 60, objectFit: "cover", borderRadius: 8 }}
                  />
                  <Stack sx={{ flex: 1 }}>
                    <Typography variant="subtitle1">{it.product?.name}</Typography>
                    <Typography variant="body2">Qty: {it.qty}</Typography>
                  </Stack>
                  <Typography sx={{ width: 80, textAlign: "right" }}>
                    ${Number(it.line_total || 0).toFixed(2)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1">Subtotal:</Typography>
              <Typography variant="h6">${subtotal.toFixed(2)}</Typography>
            </Stack>
          </Paper>

          <Paper sx={{ p: 2, mb: 3 }}>
            <Stack spacing={2}>
              <TextField
                label="Pickup/Delivery Date"
                type="date"
                value={fulfillmentDate}
                onChange={(e) => setFulfillmentDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                label="Requested Time (optional)"
                type="time"
                value={requestedTime}
                onChange={(e) => setRequestedTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />

              <div>
                <FormLabel sx={{ mb: 1 }}>Fulfillment Method</FormLabel>
                <RadioGroup
                  row
                  value={method}
                  onChange={(_, v) => setMethod(v)}
                >
                  <FormControlLabel value="pickup" control={<Radio />} label="Pickup" />
                  <FormControlLabel value="delivery" control={<Radio />} label="Delivery" />
                </RadioGroup>
              </div>

              {method === "delivery" && (
                <Stack spacing={2}>
                  <TextField
                    label="Name"
                    value={delivery.name}
                    onChange={(e) => setDelivery({ ...delivery, name: e.target.value })}
                    required
                  />
                  <TextField
                    label="Address line 1"
                    value={delivery.line1}
                    onChange={(e) => setDelivery({ ...delivery, line1: e.target.value })}
                    required
                  />
                  <TextField
                    label="Address line 2"
                    value={delivery.line2}
                    onChange={(e) => setDelivery({ ...delivery, line2: e.target.value })}
                  />
                  <Stack direction="row" spacing={2}>
                    <TextField
                      label="City"
                      value={delivery.city}
                      onChange={(e) => setDelivery({ ...delivery, city: e.target.value })}
                      required
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="State"
                      value={delivery.state}
                      onChange={(e) => setDelivery({ ...delivery, state: e.target.value })}
                      required
                      sx={{ width: 120 }}
                    />
                    <TextField
                      label="ZIP"
                      value={delivery.zip}
                      onChange={(e) => setDelivery({ ...delivery, zip: e.target.value })}
                      required
                      sx={{ width: 160 }}
                    />
                  </Stack>
                </Stack>
              )}
            </Stack>
          </Paper>

          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={!canPlace()}
            onClick={placeOrder}
          >
            Place Order
          </Button>
        </>
      )}
    </Container>
  );
}
